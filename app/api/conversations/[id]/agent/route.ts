import { z } from "zod";
import { NextResponse } from "next/server";
import type { Plan, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { parseMessages, readSpec, emptySpec, type ChatMessage } from "@/lib/conversation-helpers";
import { parseHistory, commitSnapshot, historyTimeline, canUndo, canRedo } from "@/lib/conversation-history";
import { runKiaModification } from "@/lib/agent/run-modification";
import { summarizeAppliedOperations, describeOperation } from "@/lib/agent/operation-descriptions";
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
  /** True when `content` is already the last persisted user message (initial
   *  reply of a freshly created conversation) — don't re-append it. */
  replay: z.boolean().optional(),
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
    include: { job: { select: { id: true, name: true, status: true } } },
  });
  if (!conv) return jsonError("Conversation introuvable.", 404);

  // The spec is built LIVE from message 1: a brand-new conversation starts from a
  // blank spec and the agent fills it in. No job is required — modifications sync
  // to the linked job only once one exists.
  const spec = readSpec(conv.spec ?? null) ?? emptySpec(conv.title);

  const approved = parseApproved(body.confirm);
  const isConfirmFollowUp = approved.length > 0;

  const history = parseMessages(conv.messages);
  const last = history[history.length - 1];
  const isAlreadyPersisted =
    body.replay === true && last && last.role === "user" && last.content === body.content;
  const skipAppend = isConfirmFollowUp || isAlreadyPersisted;

  // On a confirmation follow-up (or the seed replay) the user message is already
  // persisted; otherwise append it now so the agent + thread see the instruction.
  const userMsg: ChatMessage = { role: "user", content: body.content, ts: Date.now() };
  const baseHistory = skipAppend ? history : [...history, userMsg];

  if (!skipAppend) {
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { messages: baseHistory as unknown as Prisma.InputJsonValue },
    });
  }

  // Stream the build live (NDJSON): one "operation" event per applied op (with the
  // post-op spec so the graph fills in progressively), then a final "done" event.
  const encoder = new TextEncoder();
  const enc = (ev: unknown) => encoder.encode(JSON.stringify(ev) + "\n");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let result;
      try {
        result = await runKiaModification({
          plan: user.plan as Plan,
          spec,
          apiName: conv.job?.name ?? conv.title,
          messages: baseHistory.map((m) => ({ role: m.role, content: m.content })),
          approvedConfirmations: approved,
          onOperationApplied: (entry, currentSpec) => {
            controller.enqueue(
              enc({
                type: "operation",
                op: {
                  type: entry.type,
                  danger: entry.danger,
                  params: entry.params,
                  text: describeOperation(entry.type, entry.params),
                },
                spec: currentSpec,
              }),
            );
          },
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Erreur de l'agent.";
        controller.enqueue(enc({ type: "error", error: `L'agent Kia a échoué — ${detail}` }));
        controller.close();
        return;
      }

      const meta = `kia · ${result.provider}/${result.model}`;

      try {
        if (result.pendingConfirmations.length > 0) {
          // Destructive op needs confirmation — surface the impact, change nothing.
          controller.enqueue(
            enc({
              type: "done",
              status: "confirmation",
              requiresConfirmation: result.pendingConfirmations,
              confirm: result.pendingConfirmations.map((c) => c.operation),
              assistant: result.assistantText,
              meta,
            }),
          );
        } else if (result.error) {
          controller.enqueue(enc({ type: "error", error: `L'agent Kia a échoué — ${result.error}` }));
        } else if (!result.changed) {
          const note =
            result.assistantText?.trim() || "Aucun changement à appliquer — précise ta demande.";
          const assistantMsg: ChatMessage = { role: "assistant", content: note, ts: Date.now(), meta };
          await prisma.conversation
            .update({
              where: { id: conv.id },
              data: { messages: [...baseHistory, assistantMsg] as unknown as Prisma.InputJsonValue },
            })
            .catch(() => undefined);
          controller.enqueue(
            enc({ type: "done", status: "noop", operations: result.operations, assistant: note, meta }),
          );
        } else {
          // Applied — keep Kia's prose (may include a follow-up question) + the ops.
          const summary = summarizeAppliedOperations(result.operations);
          const note = result.assistantText?.trim() || summary;
          const assistantMsg: ChatMessage = { role: "assistant", content: note, ts: Date.now(), meta };
          const committed = commitSnapshot(
            parseHistory(conv.specHistory),
            conv.specVersion,
            spec,
            result.spec,
            summary,
          );
          const writes: Prisma.PrismaPromise<unknown>[] = [
            prisma.conversation.update({
              where: { id: conv.id },
              data: {
                messages: [...baseHistory, assistantMsg] as unknown as Prisma.InputJsonValue,
                spec: result.spec as unknown as Prisma.InputJsonValue,
                specHistory: committed.history as unknown as Prisma.InputJsonValue,
                specVersion: committed.version,
              },
            }),
          ];
          // Only a DRAFT (not-yet-built) job tracks the live spec. Once a
          // version has been built/deployed we must NOT overwrite it — the
          // edit lives in the conversation until the user generates a new
          // version (which creates a fresh build in the lineage).
          if (conv.job && conv.job.status === "DRAFT") {
            writes.push(
              prisma.job.update({
                where: { id: conv.job.id },
                data: { spec: result.spec as unknown as Prisma.InputJsonValue },
              }),
            );
          }
          await prisma.$transaction(writes);
          controller.enqueue(
            enc({
              type: "done",
              status: "applied",
              operations: result.operations,
              spec: result.spec,
              assistant: note,
              meta,
              version: committed.version,
              history: historyTimeline(committed.history),
              canUndo: canUndo(committed.history, committed.version),
              canRedo: canRedo(committed.history, committed.version),
            }),
          );
        }
      } catch {
        controller.enqueue(enc({ type: "error", error: "Erreur lors de l'enregistrement." }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
