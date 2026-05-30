import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SPEC_SYSTEM_PROMPT, countEndpoints, type ZeroAPISpec } from "@/lib/spec";
import { generateAndParseSpec } from "@/lib/spec-generation";
import { runSpecAgent } from "@/lib/agent/spec-agent";
import { parseMessages, readSpec } from "@/lib/conversation-helpers";
import { triggerGenerateJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  if (user.generationsUsed >= user.generationsLimit) {
    return NextResponse.json(
      { error: `Limite atteinte (${user.generationsLimit} générations sur ton plan ${user.plan}).` },
      { status: 402 },
    );
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
  let agentLabel = "spec_generation";
  let agentMessage: string;

  if (isModification) {
    // Incremental modification: the Kia agent emits targeted operation calls on
    // the existing spec (no full regeneration → no drift). Destructive ops are
    // surfaced for confirmation instead of being executed.
    const t0 = Date.now();
    const result = await runSpecAgent({
      spec: previousSpec as ZeroAPISpec,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      plan: user.plan,
    });

    if (result.status === "needs_confirmation") {
      return NextResponse.json(
        {
          needsConfirmation: true,
          confirmations: result.pendingConfirmations,
          appliedOperations: result.appliedOperations.map((o) => o.type),
          message: result.message,
        },
        { status: 200 },
      );
    }
    if (result.status === "error") {
      return NextResponse.json(
        { error: result.message, details: result.error ?? null },
        { status: 502 },
      );
    }
    if (result.status === "no_change") {
      return NextResponse.json(
        { noChange: true, message: result.message },
        { status: 200 },
      );
    }

    spec = result.spec;
    info = { provider: result.provider, model: result.model, latencyMs: Date.now() - t0 };
    agentLabel = "spec_modification";
    agentMessage =
      `${result.provider}/${result.model} · ops=[${result.appliedOperations.map((o) => o.type).join(", ")}]`;
  } else {
    // First generation (blank spec from a prompt): unchanged full generation.
    try {
      const result = await generateAndParseSpec(
        user.plan,
        messages.map((m) => ({ role: m.role, content: m.content })),
        { systemPrompt: SPEC_SYSTEM_PROMPT },
      );
      spec = result.spec;
      info = result.info;
      agentMessage = `${info.provider}/${info.model}`;
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
        agent: agentLabel,
        status: "done",
        message: agentMessage,
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
