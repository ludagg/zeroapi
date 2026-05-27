import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendTeamInviteEmail } from "@/lib/resend";

const Schema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "member"]).default("member"),
});

const FREE_PLAN = "FREE";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  if (user.plan === FREE_PLAN) {
    return NextResponse.json(
      { error: "Le plan Free ne permet pas d'inviter des membres. Passe à Pro." },
      { status: 402 },
    );
  }

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Requête invalide.", details: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();

  const existing = await prisma.teamMember.findFirst({
    where: { userId: user.id, email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ce membre est déjà dans l'équipe." },
      { status: 409 },
    );
  }

  const member = await prisma.teamMember.create({
    data: { userId: user.id, email, role: body.role },
  });

  // Best-effort email — silent fallback if Resend isn't configured.
  void sendTeamInviteEmail({
    to: email,
    inviterName: user.name ?? user.email.split("@")[0] ?? "Quelqu'un",
    workspaceName: `Workspace de ${user.name ?? user.email.split("@")[0]}`,
  }).catch(() => undefined);

  return NextResponse.json({ id: member.id });
}
