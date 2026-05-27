import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routeLLMStream } from "@/lib/llm-router";
import {
  CONVERSATION_SYSTEM_PROMPT,
  estimateProgress,
  type ConversationMessage,
} from "@/lib/spec";
import { captureException } from "@/lib/observability";
import { checkGenerationLimits, clientIp, denyResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["assistant", "user"]),
        content: z.string().max(8000),
      }),
    )
    .min(1)
    .max(40),
});

type StreamEvent =
  | { type: "meta"; provider: string; model: string; progress: number }
  | { type: "chunk"; text: string }
  | { type: "done" }
  | { type: "error"; error: string };

function encodeEvent(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return jsonError("Non authentifié.", 401);
  }

  let payload: z.infer<typeof RequestSchema>;
  try {
    payload = RequestSchema.parse(await req.json());
  } catch (err) {
    return jsonError(
      err instanceof Error ? `Requête invalide. ${err.message}` : "Requête invalide.",
      400,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  if (!user) return jsonError("Utilisateur introuvable.", 404);

  const deny = await checkGenerationLimits({
    userId: session.user.id,
    plan: user.plan,
    ip: clientIp(),
    consumesDailyQuota: false,
  });
  if (deny) return denyResponse(deny);

  let routed;
  try {
    routed = await routeLLMStream("conversation", user.plan, {
      messages: [
        { role: "system", content: CONVERSATION_SYSTEM_PROMPT },
        ...payload.messages,
      ],
      maxTokens: 800,
      temperature: 0.7,
    });
  } catch (err) {
    captureException(err, { scope: "api.generate.stream", userId: session.user.id });
    return jsonError(err instanceof Error ? err.message : "Erreur LLM.", 502);
  }

  const progress = estimateProgress(payload.messages as ConversationMessage[]);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encodeEvent({
          type: "meta",
          provider: routed.provider,
          model: routed.model,
          progress,
        }),
      );
      try {
        for await (const chunk of routed.stream) {
          if (chunk.type === "text") {
            controller.enqueue(encodeEvent({ type: "chunk", text: chunk.text }));
          }
        }
        controller.enqueue(encodeEvent({ type: "done" }));
      } catch (err) {
        captureException(err, {
          scope: "api.generate.stream.body",
          userId: session.user.id,
        });
        controller.enqueue(
          encodeEvent({
            type: "error",
            error: err instanceof Error ? err.message : "Erreur de stream.",
          }),
        );
      } finally {
        controller.close();
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

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
