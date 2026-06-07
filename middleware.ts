import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

/**
 * Edge middleware: applies security headers to every response and detects
 * probes for well-known sensitive paths (vulnerability scanners). A detected
 * scan is answered with 404 and reported (fire-and-forget) to the Node-runtime
 * internal endpoint, which persists it and alerts the Telegram admin bot.
 *
 * It runs on the edge runtime, so it cannot touch Prisma/Redis directly —
 * hence the hand-off to /api/internal/security.
 */

const SUSPICIOUS_PATHS: RegExp[] = [
  /\/\.env(\.|$|\/)/i,
  /\/\.git(\/|$)/i,
  /\/\.svn(\/|$)/i,
  /\/\.ssh(\/|$)/i,
  /\/\.aws(\/|$)/i,
  /\/\.DS_Store$/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/wp-includes/i,
  /\/wp-content/i,
  /\/xmlrpc\.php/i,
  /\/phpmyadmin/i,
  /\/phpunit/i,
  /\/vendor\//i,
  /\/cgi-bin\//i,
  /\/server-status/i,
  /\/actuator(\/|$)/i,
  /\/config\.(php|json|ya?ml)$/i,
  /\/\.(?:bak|old|sql|backup)$/i,
];

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return res;
}

async function reportScan(req: NextRequest): Promise<void> {
  const secret = process.env.INTERNAL_EVENT_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) return;
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await fetch(new URL("/api/internal/security", req.nextUrl.origin), {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({
        type: "scan.suspicious",
        path: req.nextUrl.pathname,
        method: req.method,
        ip,
        userAgent: req.headers.get("user-agent"),
      }),
    });
  } catch {
    // best-effort; never block the response
  }
}

export function middleware(req: NextRequest, event: NextFetchEvent): NextResponse {
  const { pathname } = req.nextUrl;

  if (SUSPICIOUS_PATHS.some((re) => re.test(pathname))) {
    event.waitUntil(reportScan(req));
    return withSecurityHeaders(
      new NextResponse("Not found", {
        status: 404,
        headers: { "content-type": "text/plain" },
      }),
    );
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|otf|css|js|map)$).*)",
  ],
};
