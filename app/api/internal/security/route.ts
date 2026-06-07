import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";

// Needs Prisma + Telegram → Node runtime (the caller is edge middleware).
export const runtime = "nodejs";

/**
 * Internal sink for security events detected in edge middleware (which cannot
 * reach the database). Authenticated by a shared secret header so it can't be
 * spammed from the outside.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.INTERNAL_EVENT_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret || req.headers.get("x-internal-secret") !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // empty body → defaults below
  }

  const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
  const path = str(body.path);

  await logActivity({
    type: str(body.type) ?? "scan.suspicious",
    kind: "SECURITY",
    severity: "WARNING",
    message: path ? `Requête suspecte vers ${path}` : "Requête suspecte détectée",
    ip: str(body.ip),
    userAgent: str(body.userAgent),
    path,
    method: str(body.method),
  });

  return NextResponse.json({ ok: true });
}
