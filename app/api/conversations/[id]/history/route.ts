import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  parseHistory,
  moveVersion,
  canUndo,
  canRedo,
  historyTimeline,
} from "@/lib/conversation-history";

export const dynamic = "force-dynamic";

/**
 * Undo / redo / restore the conversation spec — moves the `specVersion` pointer
 * within `specHistory` and restores the corresponding spec (anti-drift: we never
 * recompute, we replay an archived snapshot). Keeps the linked job's spec in sync.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: { action?: string; version?: number };
  try {
    body = (await req.json()) as { action?: string; version?: number };
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const action = body.action;
  if (action !== "undo" && action !== "redo" && action !== "restore") {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: { select: { id: true } } },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  const history = parseHistory(conv.specHistory);
  const moved = moveVersion(history, conv.specVersion, action, body.version);
  if (!moved) {
    return NextResponse.json({ error: "Rien à faire." }, { status: 409 });
  }

  const specValue =
    moved.spec === null
      ? Prisma.DbNull
      : (moved.spec as unknown as Prisma.InputJsonValue);

  const writes: Prisma.PrismaPromise<unknown>[] = [
    prisma.conversation.update({
      where: { id: conv.id },
      data: { spec: specValue, specVersion: moved.version },
    }),
  ];
  if (conv.job) {
    writes.push(
      prisma.job.update({ where: { id: conv.job.id }, data: { spec: specValue } }),
    );
  }
  await prisma.$transaction(writes);

  return NextResponse.json({
    spec: moved.spec,
    version: moved.version,
    history: historyTimeline(history),
    canUndo: canUndo(history, moved.version),
    canRedo: canRedo(history, moved.version),
  });
}
