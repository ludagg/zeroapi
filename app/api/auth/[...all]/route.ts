import { auth } from "@/lib/auth";
import { logActivity, requestMeta } from "@/lib/activity";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Better Auth handler, wrapped to (1) throttle sign-in attempts per IP and
 * (2) journal authentication activity — successful logins, failed logins
 * (security) and new signups — feeding the activity log + Telegram alerts.
 */

// Max sign-in attempts per IP before we hard-block + alert (brute-force).
const SIGNIN_LIMIT = 10;
const SIGNIN_WINDOW_SEC = 300;

async function readEmail(req: Request): Promise<string | null> {
  try {
    const data = (await req.clone().json()) as { email?: unknown };
    return typeof data.email === "string" ? data.email : null;
  } catch {
    return null;
  }
}

async function handler(req: Request): Promise<Response> {
  const meta = requestMeta(req);
  const path = meta.path ?? "";
  const isPost = req.method === "POST";
  const isSignIn = isPost && path.endsWith("/sign-in/email");
  const isSignUp = isPost && path.endsWith("/sign-up/email");

  if (isSignIn && meta.ip) {
    const rl = await rateLimit(`auth:signin:${meta.ip}`, SIGNIN_LIMIT, SIGNIN_WINDOW_SEC);
    if (!rl.allowed) {
      await logActivity({
        type: "auth.bruteforce",
        kind: "SECURITY",
        severity: "CRITICAL",
        message: `Trop de tentatives de connexion (${rl.count}) depuis ${meta.ip}`,
        ip: meta.ip,
        userAgent: meta.userAgent,
        path: meta.path,
        method: meta.method,
      });
      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Réessaie dans quelques minutes." }),
        {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": String(rl.resetSec) },
        },
      );
    }
  }

  const email = isSignIn || isSignUp ? await readEmail(req) : null;
  const res = await auth.handler(req);
  const ok = res.status >= 200 && res.status < 300;

  if (isSignIn) {
    if (ok) {
      await logActivity({
        type: "auth.signin.success",
        kind: "ACTIVITY",
        message: "Connexion réussie",
        actorEmail: email,
        ip: meta.ip,
        userAgent: meta.userAgent,
        path: meta.path,
        method: meta.method,
        notify: null, // logged, but too noisy to ping on every login
      });
    } else if (res.status === 400 || res.status === 401 || res.status === 403) {
      await logActivity({
        type: "auth.signin.failed",
        kind: "SECURITY",
        severity: "WARNING",
        message: "Échec de connexion (identifiants invalides)",
        actorEmail: email,
        ip: meta.ip,
        userAgent: meta.userAgent,
        path: meta.path,
        method: meta.method,
      });
    }
  } else if (isSignUp && ok) {
    await logActivity({
      type: "user.signup",
      kind: "ACTIVITY",
      message: "Nouvelle inscription",
      actorEmail: email,
      ip: meta.ip,
      userAgent: meta.userAgent,
      path: meta.path,
      method: meta.method,
      notify: "productActivity",
    });
  }

  return res;
}

export { handler as GET, handler as POST };
