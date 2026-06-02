import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { countEndpoints } from "@/lib/spec";
import { readSpec } from "@/lib/conversation-helpers";

export const dynamic = "force-dynamic";

type Visibility = "PUBLIC" | "PRIVATE";

type SaveBody = {
  visibility?: Visibility;
  /** Required (title) when publishing PUBLIC — the marketplace listing fields. */
  template?: { title?: string; description?: string; category?: string };
};

/** Map a category to a default emoji for the marketplace card. */
const CATEGORY_EMOJI: Record<string, string> = {
  Blog: "📝",
  "E-commerce": "🛒",
  Réservation: "📅",
  Livraison: "🛵",
  Paiements: "💸",
  Social: "💬",
  SaaS: "🏢",
  API: "⚙️",
};

async function readBody(req: Request): Promise<SaveBody> {
  try {
    const raw = (await req.json()) as SaveBody;
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

/**
 * Reflect a job's PUBLIC/PRIVATE choice into the marketplace `Template` table.
 *  - PUBLIC  → create the community template (or refresh the existing one),
 *              keeping its usageCount; isOfficial=false, authorId=user.
 *  - PRIVATE → retire any existing template (flip it back to PRIVATE).
 * Runs inside the caller's transaction so job + template stay consistent.
 */
async function syncCommunityTemplate(
  tx: Prisma.TransactionClient,
  args: {
    userId: string;
    jobId: string;
    jobName: string;
    spec: ZeroAPISpec;
    visibility: Visibility;
    template?: SaveBody["template"];
  },
) {
  const existing = await tx.template.findUnique({ where: { jobId: args.jobId } });

  if (args.visibility === "PRIVATE") {
    if (existing && existing.visibility !== "PRIVATE") {
      await tx.template.update({ where: { id: existing.id }, data: { visibility: "PRIVATE" } });
    }
    return;
  }

  const title = args.template?.title?.trim() || args.jobName || args.spec.name;
  const description = args.template?.description?.trim() || args.spec.description || "";
  const category = args.template?.category?.trim() || "Autre";
  const emoji = CATEGORY_EMOJI[category] ?? "✦";
  const specJson = args.spec as unknown as object;

  if (existing) {
    await tx.template.update({
      where: { id: existing.id },
      data: { title, description, category, emoji, spec: specJson, visibility: "PUBLIC", isOfficial: false },
    });
  } else {
    await tx.template.create({
      data: {
        title,
        description,
        category,
        emoji,
        spec: specJson,
        isOfficial: false,
        visibility: "PUBLIC",
        authorId: args.userId,
        jobId: args.jobId,
      },
    });
  }
}

/**
 * Save the live conversation spec as a DRAFT job — WITHOUT launching the build.
 *
 * The conversation is the working draft (spec built live by the Kia agent). This
 * promotes it to a real Job in DRAFT status so it shows up in "Jobs"; the actual
 * backend generation is started later from the job page (POST …/jobs/[id]/start).
 * No generation quota is consumed until generation is actually launched.
 *
 * When `visibility` is PUBLIC, the job is also published as a community template
 * in the marketplace.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await readBody(req);
  const visibility: Visibility = body.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE";

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  // Idempotent — a conversation already linked to a job just returns it.
  if (conv.jobId) return NextResponse.json({ jobId: conv.jobId });

  const spec = readSpec(conv.spec ?? null);
  if (!spec || spec.resources.length === 0) {
    return NextResponse.json(
      { error: "Décris au moins une ressource avant de sauvegarder le job." },
      { status: 400 },
    );
  }

  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.job.create({
      data: {
        userId: user.id,
        // Display name = the (regenerated) conversation title; spec.name stays a
        // code-safe slug used by the generator.
        name: conv.title?.trim() || spec.name,
        description: spec.description ?? "",
        status: "DRAFT",
        visibility,
        spec: spec as unknown as object,
        endpoints: countEndpoints(spec),
        estimatedTime: 120,
      },
    });
    await tx.conversation.update({
      where: { id: conv.id },
      data: { jobId: created.id },
    });
    await syncCommunityTemplate(tx, {
      userId: user.id,
      jobId: created.id,
      jobName: created.name,
      spec,
      visibility,
      template: body.template,
    });
    return created;
  });

  return NextResponse.json({ jobId: job.id, visibility });
}

/**
 * Update an already-saved job: refresh its spec from the conversation (a new
 * "version", no re-deploy) and/or change its marketplace visibility.
 *
 * Returns `hasActiveDeployment` so the client can warn the user that the live
 * deployment is now out of date with this version (and offer to redeploy).
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await readBody(req);

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: { include: { deployment: { select: { status: true } } } } },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  if (!conv.job) {
    return NextResponse.json({ error: "Aucun job à mettre à jour." }, { status: 400 });
  }

  const spec = readSpec(conv.spec ?? null);
  if (!spec || spec.resources.length === 0) {
    return NextResponse.json(
      { error: "Décris au moins une ressource avant de mettre à jour le job." },
      { status: 400 },
    );
  }

  // Visibility defaults to the job's current value when the client doesn't send one.
  const visibility: Visibility =
    body.visibility === "PUBLIC" ? "PUBLIC" : body.visibility === "PRIVATE" ? "PRIVATE" : conv.job.visibility;

  const job = conv.job;
  await prisma.$transaction(async (tx) => {
    await tx.job.update({
      where: { id: job.id },
      data: {
        description: spec.description ?? "",
        spec: spec as unknown as object,
        endpoints: countEndpoints(spec),
        visibility,
      },
    });
    await syncCommunityTemplate(tx, {
      userId: user.id,
      jobId: job.id,
      jobName: job.name,
      spec,
      visibility,
      template: body.template,
    });
  });

  // A deployment is "active" once it's live (ONLINE) or in the middle of rolling
  // out (DEPLOYING) — in both cases the running code no longer matches the spec.
  const status = job.deployment?.status;
  const hasActiveDeployment = status === "ONLINE" || status === "DEPLOYING";

  return NextResponse.json({ jobId: job.id, visibility, hasActiveDeployment });
}
