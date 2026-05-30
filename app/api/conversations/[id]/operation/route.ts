import { z } from "zod";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { parseMessages, readSpec, type ChatMessage } from "@/lib/conversation-helpers";
import { applyOperation } from "@/lib/operations";
import type { Operation, OperationType } from "@/lib/operations/types";
import { OPERATION_DANGER } from "@/lib/operations/registry";
import { OPERATION_TOOLBOX } from "@/lib/agent/operation-schemas";
import { describeOperation } from "@/lib/agent/operation-descriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Direct operation endpoint — the GRAPH editor path.
 *
 * The graph never mutates the spec itself: a user gesture (e.g. dragging a
 * relation A → B) emits a typed OPERATION, exactly like the Kia agent's tools.
 * The operation is validated with the SAME zod schema (`OPERATION_TOOLBOX`) and
 * applied through the SAME engine (`applyOperation` → validation gate), so the
 * anti-drift guarantee is identical: an invalid operation is rejected and the
 * original spec is left untouched.
 *
 * Allow-list: only the operations the graph UI currently supports are accepted.
 * It grows as graph editing expands (relations now; fields/rename/remove later).
 */
const GRAPH_OPERATIONS = new Set<OperationType>(["addRelation", "addField", "removeField"]);

const RequestSchema = z.object({
  type: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
  /** User approval for a destructive op (e.g. removeField). Injected as
   *  `confirmed: true` only when true — the UI never confirms on its own. */
  confirmed: z.boolean().optional(),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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

  const type = body.type as OperationType;
  if (!(type in OPERATION_DANGER) || !GRAPH_OPERATIONS.has(type)) {
    return jsonError(`Opération "${body.type}" non supportée par l'éditeur de graphe.`, 400);
  }

  // Validate params with the same schema that powers the agent's tools.
  const parsed = OPERATION_TOOLBOX[type].schema.safeParse(body.params ?? {});
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(`Paramètres invalides pour "${type}"${first ? ` : ${first.message}` : ""}.`, 400);
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

  const opParams = parsed.data as Record<string, unknown>;
  const op = { type, ...opParams } as Operation;
  // The UI can never self-confirm: `confirmed` is injected only when the user
  // explicitly approved the impact (re-sent with confirmed:true).
  if (body.confirmed === true) {
    (op as { confirmed?: boolean }).confirmed = true;
  }
  const res = applyOperation(spec, op);

  if (!res.ok) {
    // Destructive op needing confirmation (not expected for addRelation, but the
    // engine path is generic) — surface the impact, change nothing.
    if (res.requiresConfirmation) {
      return NextResponse.json(
        { error: res.error, requiresConfirmation: [res.requiresConfirmation], confirm: [type] },
        { status: 409 },
      );
    }
    // Invalid operation → clear message. applyOperation never mutated the spec.
    return jsonError(res.error, 422);
  }

  const summary = describeOperation(type, opParams);
  const danger = OPERATION_DANGER[type];
  const meta = "graphe";
  const assistantMsg: ChatMessage = { role: "assistant", content: `✓ ${summary}`, ts: Date.now(), meta };
  const history = parseMessages(conv.messages);

  await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conv.id },
      data: {
        messages: [...history, assistantMsg] as unknown as Prisma.InputJsonValue,
        spec: res.spec as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.job.update({
      where: { id: conv.job.id },
      data: { spec: res.spec as unknown as Prisma.InputJsonValue },
    }),
  ]);

  return NextResponse.json({
    status: "applied",
    spec: res.spec,
    operations: [{ type, danger, params: opParams, outcome: "applied" }],
    assistant: `✓ ${summary}`,
    meta,
  });
}
