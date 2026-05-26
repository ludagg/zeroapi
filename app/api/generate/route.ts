import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routeLLM } from "@/lib/llm-router";
import {
  CONVERSATION_SYSTEM_PROMPT,
  SPEC_SYSTEM_PROMPT,
  countEndpoints,
  estimateProgress,
  safeParseSpec,
  stripJsonBlocks,
  type ConversationMessage,
} from "@/lib/spec";
import { triggerGenerateJob } from "@/lib/jobs";

const MessageArray = z
  .array(
    z.object({
      role: z.enum(["assistant", "user"]),
      content: z.string().max(8000),
    }),
  )
  .min(1)
  .max(40);

const RequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("conversation"), messages: MessageArray }),
  z.object({ mode: z.literal("validate"), messages: MessageArray }),
  z.object({
    mode: z.literal("launch"),
    messages: MessageArray.optional(),
    spec: z.unknown().optional(),
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
        reply: stripJsonBlocks(res.content),
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

  // ============ VALIDATE ============
  // Generates the spec from the conversation and returns a short, human
  // readable summary. The full spec is sent back too, but the client is
  // expected to keep it hidden — only the summary is rendered in chat.
  if (payload.mode === "validate") {
    try {
      const res = await routeLLM("spec_generation", user.plan, {
        messages: [
          { role: "system", content: SPEC_SYSTEM_PROMPT },
          ...payload.messages,
          {
            role: "user",
            content:
              "Génère maintenant la spec JSON finale conforme au schéma. Réponds en JSON pur, sans markdown.",
          },
        ],
        maxTokens: 4096,
        temperature: 0.1,
        json: true,
      });
      const spec = safeParseSpec(res.content);
      return NextResponse.json({
        ok: true,
        spec,
        summary: {
          resourceCount: spec.resources.length,
          authStrategy: spec.auth?.strategy?.toUpperCase() ?? null,
          rolesCount: spec.roles?.length ?? 0,
          endpointCount: countEndpoints(spec),
          name: spec.name,
        },
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : null;
      return NextResponse.json(
        {
          ok: false,
          error: detail
            ? `Impossible de valider le plan — ${detail}`
            : "Impossible de valider le plan. Précise ta description.",
        },
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
  // If the client already validated the plan, accept the spec directly to
  // avoid paying for the LLM call twice.
  if (payload.spec !== undefined) {
    try {
      spec = safeParseSpec(
        typeof payload.spec === "string" ? payload.spec : JSON.stringify(payload.spec),
      );
    } catch (err) {
      return NextResponse.json(
        {
          error:
            "La spec fournie n'est plus valide — relance la validation du plan.",
          details: err instanceof Error ? err.message : null,
        },
        { status: 400 },
      );
    }
  } else if (payload.messages) {
    try {
      const res = await routeLLM("spec_generation", user.plan, {
        messages: [
          { role: "system", content: SPEC_SYSTEM_PROMPT },
          ...payload.messages,
          {
            role: "user",
            content:
              "Génère maintenant la spec JSON finale conforme au schéma. Réponds en JSON pur, sans markdown.",
          },
        ],
        maxTokens: 4096,
        temperature: 0.1,
        json: true,
      });
      spec = safeParseSpec(res.content);
      specGenInfo = { provider: res.provider, model: res.model, latencyMs: res.latencyMs };
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
  } else {
    return NextResponse.json(
      { error: "Aucune spec ni conversation fournie pour le lancement." },
      { status: 400 },
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
