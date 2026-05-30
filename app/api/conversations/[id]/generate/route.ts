import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { countEndpoints, type ZeroAPISpec } from "@/lib/spec";
import { generateAndParseSpec } from "@/lib/spec-generation";
import { parseMessages, readSpec } from "@/lib/conversation-helpers";
import { triggerGenerateJob } from "@/lib/jobs";
import { runKiaModification } from "@/lib/agent/run-modification";
import { OPERATION_DANGER } from "@/lib/operations/registry";
import type { OperationType } from "@/lib/operations/types";

export const dynamic = "force-dynamic";

/** Operation types the user explicitly approved for this run (destructive ops). */
function parseApproved(value: unknown): OperationType[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is OperationType => typeof v === "string" && v in OPERATION_DANGER,
  );
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  if (user.generationsUsed >= user.generationsLimit) {
    return NextResponse.json(
      { error: `Limite atteinte (${user.generationsLimit} générations sur ton plan ${user.plan}).` },
      { status: 402 },
    );
  }

  // Optional body: { confirm?: string[] } — operation types the user approved.
  let approvedConfirmations: OperationType[] = [];
  try {
    const body = await req.json();
    approvedConfirmations = parseApproved((body as { confirm?: unknown })?.confirm);
  } catch {
    // No / empty body — fine, this is the common case.
  }

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: { select: { name: true } } },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  const messages = parseMessages(conv.messages);
  if (messages.length < 1) {
    return NextResponse.json({ error: "Conversation vide." }, { status: 400 });
  }

  const previousSpec = readSpec(conv.spec ?? null);
  const isModification = Boolean(previousSpec && conv.job);

  let spec: ZeroAPISpec;
  let info: { provider: string; model: string; latencyMs: number };

  if (isModification && previousSpec && conv.job) {
    // ── MODIFICATION via the KIA agent (operation calls, no full regen) ──────
    // The model emits operation calls; the engine applies + validates them. The
    // spec is never rewritten by the model, so unrelated parts can't drift.
    const startedAt = Date.now();
    let result;
    try {
      result = await runKiaModification({
        plan: user.plan,
        spec: previousSpec,
        apiName: conv.job.name,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        approvedConfirmations,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : null;
      return NextResponse.json(
        { error: detail ? `L'agent KIA a échoué — ${detail}` : "L'agent KIA a échoué.", details: detail },
        { status: 502 },
      );
    }

    // A destructive operation needs explicit user confirmation: surface the
    // impact and stop. Nothing is applied; the original spec is preserved.
    if (result.pendingConfirmations.length > 0) {
      return NextResponse.json(
        {
          error: "Confirmation requise pour une opération destructive.",
          requiresConfirmation: result.pendingConfirmations,
          assistant: result.assistantText,
          // Operation types to re-send in `{ confirm: [...] }` to proceed.
          confirm: result.pendingConfirmations.map((c) => c.operation),
        },
        { status: 409 },
      );
    }

    if (result.error) {
      return NextResponse.json(
        { error: `L'agent KIA a échoué — ${result.error}`, details: result.error },
        { status: 502 },
      );
    }

    if (!result.changed) {
      return NextResponse.json(
        {
          error: "Aucun changement à appliquer — précise ta demande.",
          assistant: result.assistantText,
        },
        { status: 422 },
      );
    }

    spec = result.spec;
    info = {
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startedAt,
    };
  } else {
    // ── FIRST GENERATION (blank spec) — unchanged full-spec generation ───────
    try {
      const result = await generateAndParseSpec(
        user.plan,
        messages.map((m) => ({ role: m.role, content: m.content })),
      );
      spec = result.spec;
      info = result.info;
    } catch (err) {
      const detail = err instanceof Error ? err.message : null;
      return NextResponse.json(
        {
          error: detail
            ? `Impossible de générer une spec valide — ${detail}`
            : "Impossible de générer une spec valide. Réessaie en précisant ta description.",
          details: detail,
        },
        { status: 502 },
      );
    }
  }

  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.job.create({
      data: {
        userId: user.id,
        name: spec.name,
        description: spec.description ?? "",
        status: "PENDING",
        spec: spec as unknown as object,
        endpoints: countEndpoints(spec),
        estimatedTime: 120,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { generationsUsed: { increment: 1 } },
    });
    await tx.agentLog.create({
      data: {
        jobId: created.id,
        agent: isModification ? "kia_agent" : "spec_generation",
        status: "done",
        message: `${info.provider}/${info.model}`,
        duration: info.latencyMs,
      },
    });
    // Link the conversation to the newly created job & persist the spec.
    await tx.conversation.update({
      where: { id: conv.id },
      data: {
        jobId: created.id,
        spec: spec as unknown as Prisma.InputJsonValue,
      },
    });
    return created;
  });

  try {
    await triggerGenerateJob({ jobId: job.id, spec });
  } catch (err) {
    await prisma.job
      .update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage:
            "Impossible de déclencher la génération (Trigger.dev): " +
            (err instanceof Error ? err.message : String(err)),
          completedAt: new Date(),
        },
      })
      .catch(() => undefined);
    return NextResponse.json(
      { error: "La génération n'a pas pu être déclenchée. Réessaie dans un instant." },
      { status: 502 },
    );
  }

  return NextResponse.json({ jobId: job.id });
}
