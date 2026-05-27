import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { provisionalTitle } from "@/lib/conversation-helpers";

const CreateSchema = z.object({
  firstMessage: z.string().trim().min(1, "Message vide").max(8000),
  jobId: z.string().cuid().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: z.infer<typeof CreateSchema>;
  try {
    body = CreateSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Requête invalide.", details: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  let spec = null as unknown;
  if (body.jobId) {
    const job = await prisma.job.findFirst({
      where: { id: body.jobId, userId: user.id },
      select: { spec: true, name: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
    }
    spec = job.spec;
  }

  const title = provisionalTitle(body.firstMessage);

  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      jobId: body.jobId ?? null,
      title,
      messages: [
        {
          role: "user",
          content: body.firstMessage,
          ts: Date.now(),
        },
      ],
      spec: spec as never,
    },
    select: { id: true, title: true },
  });

  return NextResponse.json(conversation);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const rows = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      messages: true,
      jobId: true,
      job: { select: { id: true, name: true, status: true } },
      updatedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ conversations: rows });
}
