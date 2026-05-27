import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";

const Schema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(80),
});

const MAX_KEYS = 10;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Requête invalide.", details: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const active = await prisma.personalApiKey.count({
    where: { userId: user.id, revokedAt: null },
  });
  if (active >= MAX_KEYS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_KEYS} clés actives. Révoque-en une d'abord.` },
      { status: 400 },
    );
  }

  const { plaintext, prefix } = generateApiKey();
  const keyHash = await hashApiKey(plaintext);

  const created = await prisma.personalApiKey.create({
    data: {
      userId: user.id,
      name: body.name,
      keyHash,
      keyPrefix: prefix,
    },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });

  return NextResponse.json({ ...created, plaintext });
}
