import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { generateShareSlug } from "@/lib/share";

export const dynamic = "force-dynamic";

const Schema = z.object({ enabled: z.boolean() });

/** Toggle a public read-only share link for a conversation's spec. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, shareSlug: true },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  if (!body.enabled) {
    if (conv.shareSlug) {
      await prisma.conversation.update({ where: { id: conv.id }, data: { shareSlug: null } });
    }
    return NextResponse.json({ slug: null });
  }

  let slug = conv.shareSlug;
  if (!slug) {
    slug = generateShareSlug();
    await prisma.conversation.update({ where: { id: conv.id }, data: { shareSlug: slug } });
  }
  return NextResponse.json({ slug });
}
