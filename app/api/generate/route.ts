import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routeLLM } from "@/lib/llm-router";
import {
  CONVERSATION_SYSTEM_PROMPT,
  countEndpoints,
  estimateProgress,
  type ConversationMessage,
} from "@/lib/spec";
import { generateAndParseSpec } from "@/lib/spec-generation";
import { triggerGenerateJob } from "@/lib/jobs";

const RequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("conversation"),
    messages: z
      .array(
        z.object({
          role: z.enum(["assistant", "user"]),
          content: z.string().max(8000),
        }),
      )
      .min(1)
      .max(40),
  }),
  z.object({
    mode: z.literal("launch"),
    messages: z
      .array(
        z.object({
          role: z.enum(["assistant", "user"]),
          content: z.string().max(8000),
        }),
      )
      .min(2)
      .max(40),
  }),
]);

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let payload: z.infer<typeof RequestSchema>;
  try {
    payload = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Requête invalide.", details: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, plan: true, generationsUsed: true, generationsLimit: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

  // ============ CONVERSATION ============
  if (payload.mode === "conversation") {
    try {
      const res = await routeLLM("conversation", user.plan, {
        messages: [
          { role: "system", content: CONVERSATION_SYSTEM_PROMPT },
          ...payload.messages,
        ],
        maxTokens: 800,
        temperature: 0.7,
      });
      return NextResponse.json({
        reply: res.content,
        provider: res.provider,
        model: res.model,
        progress: estimateProgress(payload.messages as ConversationMessage[]),
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Erreur LLM." },
        { status: 502 },
      );
    }
  }

  // ============ LAUNCH ============
  if (user.generationsUsed >= user.generationsLimit) {
    return NextResponse.json(
      { error: `Limite atteinte (${user.generationsLimit} générations sur ton plan ${user.plan}).` },
      { status: 402 },
    );
  }

  let spec;
  let specGenInfo: { provider: string; model: string; latencyMs: number } | null = null;
  try {
    const result = await generateAndParseSpec(user.plan, payload.messages);
    spec = result.spec;
    specGenInfo = result.info;
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
    if (specGenInfo) {
      await tx.agentLog.create({
        data: {
          jobId: created.id,
          agent: "spec_generation",
          status: "done",
          message: `${specGenInfo.provider}/${specGenInfo.model}`,
          duration: specGenInfo.latencyMs,
        },
      });
    }
    return created;
  });

  try {
    await triggerGenerateJob({ jobId: job.id, spec });
  } catch (err) {
    // Trigger.dev dispatch failed — surface a 502 to the client and mark
    // the job FAILED so it doesn't sit in PENDING forever.
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
      {
        error: "La génération n'a pas pu être déclenchée. Réessaie dans un instant.",
        details: err instanceof Error ? err.message : null,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ jobId: job.id });
}
