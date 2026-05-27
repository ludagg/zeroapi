import { z } from "zod";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routeLLMStream } from "@/lib/llm-router";
import {
  CONVERSATION_SYSTEM_PROMPT,
  buildModificationSystemPrompt,
  type ConversationMessage,
} from "@/lib/spec";
import {
  MAX_MESSAGES_PER_CONVERSATION,
  parseMessages,
  readSpec,
  type ChatMessage,
} from "@/lib/conversation-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  content: z.string().trim().min(1, "Message vide").max(8000),
  /**
   * When true, the client claims `content` is already the last persisted user
   * message (e.g. the conversation was created with this message and the chat
   * UI is just kicking off the first assistant reply). The server then skips
   * re-appending the user message and only appends the assistant reply once
   * the stream completes.
   */
  replay: z.boolean().optional(),
});

type StreamEvent =
  | { type: "meta"; provider: string; model: string }
  | { type: "chunk"; text: string }
  | { type: "done" }
  | { type: "error"; error: string };

function encodeEvent(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return jsonError("Non authentifié.", 401);

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    return jsonError(
      err instanceof Error ? `Requête invalide. ${err.message}` : "Requête invalide.",
      400,
    );
  }

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { job: { select: { name: true } } },
  });
  if (!conv) return jsonError("Conversation introuvable.", 404);

  const existing = parseMessages(conv.messages);
  if (existing.length >= MAX_MESSAGES_PER_CONVERSATION) {
    return jsonError("Cette conversation a atteint sa limite de messages.", 409);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  if (!user) return jsonError("Utilisateur introuvable.", 404);

  // In replay mode the conversation already ends with this exact user message
  // (typical when the conversation was created from the dashboard chatbox and
  // we're just firing the first assistant reply). Don't double-persist.
  const replay = body.replay === true;
  const last = existing[existing.length - 1];
  const isAlreadyPersisted =
    replay && last && last.role === "user" && last.content === body.content;

  const userMsg: ChatMessage = isAlreadyPersisted
    ? last
    : { role: "user", content: body.content, ts: Date.now() };

  // Decide which system prompt to use: modification when a job + spec exist,
  // otherwise the standard conversation prompt for new APIs.
  const spec = readSpec(conv.spec ?? null);
  const systemPrompt =
    spec && conv.job
      ? buildModificationSystemPrompt(conv.job.name, spec)
      : CONVERSATION_SYSTEM_PROMPT;

  const baseHistory = isAlreadyPersisted ? existing.slice(0, -1) : existing;
  const prevForLLM = baseHistory.map<ConversationMessage>((m) => ({
    role: m.role,
    content: m.content,
  }));

  let routed;
  try {
    routed = await routeLLMStream("conversation", user.plan, {
      messages: [
        { role: "system", content: systemPrompt },
        ...prevForLLM,
        { role: "user", content: body.content },
      ],
      maxTokens: 800,
      temperature: 0.7,
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erreur LLM.", 502);
  }

  // Persist the new user message unless it was already there. The assistant
  // reply is appended at the very end of the stream.
  if (!isAlreadyPersisted) {
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        messages: [...baseHistory, userMsg] as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const collectedChunks: string[] = [];
  const conversationId = conv.id;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encodeEvent({ type: "meta", provider: routed.provider, model: routed.model }),
      );
      try {
        for await (const chunk of routed.stream) {
          if (chunk.type === "text") {
            collectedChunks.push(chunk.text);
            controller.enqueue(encodeEvent({ type: "chunk", text: chunk.text }));
          }
        }
        controller.enqueue(encodeEvent({ type: "done" }));
      } catch (err) {
        controller.enqueue(
          encodeEvent({
            type: "error",
            error: err instanceof Error ? err.message : "Erreur de stream.",
          }),
        );
      } finally {
        controller.close();
        const reply = collectedChunks.join("");
        if (reply.trim()) {
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: reply,
            ts: Date.now(),
            meta: `${routed.provider} · ${routed.model}`,
          };
          await prisma.conversation
            .update({
              where: { id: conversationId },
              data: {
                messages: [
                  ...baseHistory,
                  userMsg,
                  assistantMsg,
                ] as unknown as Prisma.InputJsonValue,
              },
            })
            .catch(() => undefined);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
