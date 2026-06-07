import { NextResponse } from "next/server";
import { failStaleJobs } from "@/lib/job-watchdog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Scheduled watchdog (Vercel Cron — see vercel.json) that auto-fails jobs
 * stuck in PENDING/RUNNING. Authenticated by CRON_SECRET (Bearer) when set,
 * otherwise it accepts Vercel's signed cron requests (x-vercel-cron header).
 */
export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") != null;

  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "forbidden" }, { status: 401 });
    }
  } else if (!isVercelCron) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }

  const result = await failStaleJobs();
  return NextResponse.json({ ok: true, ...result });
}
