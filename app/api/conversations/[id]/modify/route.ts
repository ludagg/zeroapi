import { z } from "zod";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { countEndpoints } from "@/lib/spec";
import {
  diffSpecs,
  parseMessages,
  readSpec,
  type ChatMessage,
} from "@/lib/conversation-helpers";
import { confirmAndApply, modifySpecWithAgent } from "@/lib/agent";
import type { Operation } from "@/lib/operations";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Incremental spec modification — the agent-driven replacement for full
 * regeneration. The model emits OPERATIONS; the tested engine executes them.
 *
 *   POST { content }                       → run the agent on the current spec
 *   POST { confirm: true, operations: [] } → apply user-confirmed destructive ops
 *
 * On success the modified spec is persisted to Conversation.spec (and Job.spec
 * when linked). Editing the spec does NOT trigger code regeneration
 * (OPERATIONS.md §4.4) — that stays an explicit deploy action.
 */
const RequestSchema = z.union([
  z.object({ content: z.string().trim().min(1, "Message vide").max(8000) }),
  z.object({ confirm: z.literal(true), operations: z.array(z.record(z.unknown())).min(1) }),
]);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `Requête invalide. ${err.message}` : "Requête invalide." },
      { status: 400 },
    );
  }

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  const spec = readSpec(conv.spec ?? null);
  if (!spec) {
    return NextResponse.json(
      { error: "Aucune spec à modifier — génère d'abord l'API." },
      { status: 400 },
    );
  }

  // ── Confirmation path: apply the destructive ops the user approved ────────
  if ("confirm" in body) {
    const res = confirmAndApply(spec, body.operations as unknown as Operation[]);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Opération refusée : ${res.error}` },
        { status: 422 },
      );
    }
    await persistSpec(conv.id, conv.jobId, res.spec);
    return NextResponse.json({
      status: "applied",
      operations: body.operations,
      diff: diffSpecs(spec, res.spec),
      spec: res.spec,
    });
  }

  // ── Agent path: turn the user's request into validated operations ─────────
  const appliedOps: Operation[] = [];
  let result;
  try {
    result = await modifySpecWithAgent({
      spec,
      userMessage: body.content,
      onOperations: (ops) => appliedOps.push(...ops),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur de l'agent." },
      { status: 502 },
    );
  }

  if (result.status === "error" || result.status === "max_iterations") {
    return NextResponse.json(
      { error: result.error ?? result.assistantMessage, status: result.status },
      { status: 502 },
    );
  }

  if (result.status === "needs_confirmation") {
    // Do NOT execute. Surface the computed impact so the user can decide.
    return NextResponse.json({
      status: "needs_confirmation",
      message: result.assistantMessage,
      impact: result.confirmation,
      // Echo the pending ops so the client can POST them back with confirm:true.
      pendingOperations: result.confirmation?.pendingOperations ?? [],
    });
  }

  if (result.status === "no_change") {
    await appendChat(conv.id, conv.messages, body.content, result.assistantMessage);
    return NextResponse.json({ status: "no_change", message: result.assistantMessage });
  }

  // status === "applied"
  await persistSpec(conv.id, conv.jobId, result.spec);
  await appendChat(conv.id, conv.messages, body.content, result.assistantMessage);
  await logOperations(conv.jobId, result.operations);

  return NextResponse.json({
    status: "applied",
    message: result.assistantMessage,
    operations: result.operations,
    diff: diffSpecs(spec, result.spec),
    spec: result.spec,
  });
}

/** Persists the new spec to Conversation.spec and, when linked, Job.spec. */
async function persistSpec(
  conversationId: string,
  jobId: string | null,
  spec: ZeroAPISpec,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.conversation.update({
      where: { id: conversationId },
      data: { spec: spec as unknown as Prisma.InputJsonValue },
    });
    if (jobId) {
      await tx.job.update({
        where: { id: jobId },
        data: {
          spec: spec as unknown as Prisma.InputJsonValue,
          name: spec.name,
          description: spec.description ?? "",
          endpoints: countEndpoints(spec),
        },
      });
    }
  });
}

/** Appends the user request + assistant summary to the conversation log. */
async function appendChat(
  conversationId: string,
  rawMessages: Prisma.JsonValue,
  userContent: string,
  assistantContent: string,
): Promise<void> {
  const history = parseMessages(rawMessages);
  const next: ChatMessage[] = [
    ...history,
    { role: "user", content: userContent, ts: Date.now() },
  ];
  if (assistantContent.trim()) {
    next.push({ role: "assistant", content: assistantContent, ts: Date.now(), meta: "agent" });
  }
  await prisma.conversation
    .update({
      where: { id: conversationId },
      data: { messages: next as unknown as Prisma.InputJsonValue },
    })
    .catch(() => undefined);
}

/** Best-effort audit log of the operations (requires a linked Job). */
async function logOperations(jobId: string | null, operations: Operation[]): Promise<void> {
  if (!jobId || operations.length === 0) return;
  await prisma.agentLog
    .create({
      data: {
        jobId,
        agent: "spec_modify",
        status: "done",
        message: operations.map((o) => o.type).join(", "),
      },
    })
    .catch(() => undefined);
}
