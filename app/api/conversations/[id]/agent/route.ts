import { z } from "zod";
import { NextResponse } from "next/server";
import type { Plan, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { parseMessages, readSpec, type ChatMessage } from "@/lib/conversation-helpers";
import { runKiaModification } from "@/lib/agent/run-modification";
import { summarizeAppliedOperations } from "@/lib/agent/operation-descriptions";
import { OPERATION_DANGER } from "@/lib/operations/registry";
import type { OperationType } from "@/lib/operations/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inline modification endpoint — the chat path for an EXISTING spec.
 *
 * The Kia agent (tool calling over the 66 operations) applies the user's
 * requested change to the current spec and saves it. Unlike `/generate` (which
 * ships the current spec as a build), this never creates a job: it returns the
 * applied operations so the chat can render them and the right-panel tabs can
 * refresh in real time.
 *
 * Destructive operations are never auto-confirmed: the agent returns the
 * impact, the client shows Confirm/Cancel, and re-POSTs with `confirm: [...]`.
 */

const RequestSchema = z.object({
  content: z.string().trim().min(1, "Message vide").max(8000),
  /** Operation types the user approved (re-sent after a confirmation prompt). */
  confirm: z.array(z.string()).optional(),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseApproved(value: string[] | undefined): OperationType[] {
  if (!value) return [];
  return value.filter((v): v is OperationType => v in OPERATION_DANGER);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Non authentifié.", 401);

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    return jsonError(err instanceof Error ? `Requête invalide. ${err.message}` : "Requête invalide.", 400);
  }

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: { select: { id: true, name: true } } },
  });
  if (!conv) return jsonError("Conversation introuvable.", 404);

  const spec = readSpec(conv.spec ?? null);
  if (!spec || !conv.job) {
    return jsonError("Aucune spec à modifier. Génère d'abord le backend.", 409);
  }

  const approved = parseApproved(body.confirm);
  const isConfirmFollowUp = approved.length > 0;

  const history = parseMessages(conv.messages);
  // On a confirmation follow-up the user message is already persisted; otherwise
  // append it now so the agent (and the thread) see the new instruction.
  const userMsg: ChatMessage = { role: "user", content: body.content, ts: Date.now() };
  const baseHistory = isConfirmFollowUp ? history : [...history, userMsg];

  if (!isConfirmFollowUp) {
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { messages: baseHistory as unknown as Prisma.InputJsonValue },
    });
  }

  let result;
  try {
    result = await runKiaModification({
      plan: user.plan as Plan,
      spec,
      apiName: conv.job.name,
      messages: baseHistory.map((m) => ({ role: m.role, content: m.content })),
      approvedConfirmations: approved,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur de l'agent.";
    return jsonError(`L'agent Kia a échoué — ${detail}`, 502);
  }

  const meta = `kia · ${result.provider}/${result.model}`;

  // Destructive op needs confirmation — surface the impact, change nothing.
  if (result.pendingConfirmations.length > 0) {
    return NextResponse.json({
      status: "confirmation",
      requiresConfirmation: result.pendingConfirmations,
      confirm: result.pendingConfirmations.map((c) => c.operation),
      assistant: result.assistantText,
      meta,
    });
  }

  if (result.error) {
    return jsonError(`L'agent Kia a échoué — ${result.error}`, 502);
  }

  if (!result.changed) {
    // Persist a short assistant note so the thread stays coherent on reload.
    const note = result.assistantText?.trim() || "Aucun changement à appliquer — précise ta demande.";
    const assistantMsg: ChatMessage = { role: "assistant", content: note, ts: Date.now(), meta };
    await prisma.conversation
      .update({
        where: { id: conv.id },
        data: { messages: [...baseHistory, assistantMsg] as unknown as Prisma.InputJsonValue },
      })
      .catch(() => undefined);
    return NextResponse.json({
      status: "noop",
      operations: result.operations,
      assistant: note,
      meta,
    });
  }

  // Applied — persist the readable summary + the modified spec, and keep the
  // linked job's spec in sync so "Régénérer" ships the up-to-date spec.
  const summary = summarizeAppliedOperations(result.operations);
  const assistantMsg: ChatMessage = { role: "assistant", content: summary, ts: Date.now(), meta };

  await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conv.id },
      data: {
        messages: [...baseHistory, assistantMsg] as unknown as Prisma.InputJsonValue,
        spec: result.spec as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.job.update({
      where: { id: conv.job.id },
      data: { spec: result.spec as unknown as Prisma.InputJsonValue },
    }),
  ]);

  return NextResponse.json({
    status: "applied",
    operations: result.operations,
    spec: result.spec,
    assistant: summary,
    meta,
  });
}
