import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SPEC_SYSTEM_PROMPT, countEndpoints } from "@/lib/spec";
import { generateAndParseSpec } from "@/lib/spec-generation";
import { parseMessages, readSpec } from "@/lib/conversation-helpers";
import { modifySpecWithAgent } from "@/lib/agent";
import { triggerGenerateJob } from "@/lib/jobs";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

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

  let spec: ZeroAPISpec;
  let info: { provider: string; model: string; latencyMs: number };

  if (previousSpec) {
    // MODIFICATION — drive incremental, validated operations through the agent
    // instead of regenerating the whole spec (which caused field/relation
    // drift). The model never rewrites the spec; the tested engine applies the
    // operations it chooses.
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      return NextResponse.json({ error: "Aucune instruction de modification." }, { status: 400 });
    }
    try {
      const result = await modifySpecWithAgent({ spec: previousSpec, userMessage: lastUser.content });
      if (result.status === "needs_confirmation") {
        return NextResponse.json(
          {
            error: "Cette modification est destructive et requiert une confirmation.",
            status: "needs_confirmation",
            impact: result.confirmation,
            pendingOperations: result.confirmation?.pendingOperations ?? [],
          },
          { status: 409 },
        );
      }
      if (result.status === "error" || result.status === "max_iterations") {
        return NextResponse.json(
          { error: result.error ?? "L'agent n'a pas pu appliquer la modification." },
          { status: 502 },
        );
      }
      // "applied" or "no_change" → deploy the (possibly unchanged) current spec.
      spec = result.spec;
      info = { provider: "agent", model: "operations", latencyMs: 0 };
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Erreur de l'agent de modification." },
        { status: 502 },
      );
    }
  } else {
    // FIRST GENERATION — build the spec from scratch (unchanged path).
    try {
      const result = await generateAndParseSpec(
        user.plan,
        messages.map((m) => ({ role: m.role, content: m.content })),
        { systemPrompt: SPEC_SYSTEM_PROMPT },
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
        agent: "spec_generation",
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
