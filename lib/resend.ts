import { Resend } from "resend";
import { prisma } from "./prisma";

const FROM = process.env.RESEND_FROM ?? "ZeroAPI <noreply@zeroapi.io>";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error("NEXT_PUBLIC_APP_URL must be set in production");
      })()
    : "http://localhost:3000");

let _client: Resend | null = null;

function client(): Resend | null {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _client = new Resend(key);
  return _client;
}

export async function sendJobReadyEmail(jobId: string): Promise<void> {
  const c = client();
  if (!c) return;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      user: {
        select: { email: true, name: true, notifyOnReady: true, notifyOnFailed: true },
      },
    },
  });
  if (!job) return;

  if (job.status === "FAILED" && !job.user.notifyOnFailed) return;
  if (job.status !== "FAILED" && !job.user.notifyOnReady) return;

  const firstName = job.user.name?.split(/\s+/)[0] ?? "toi";
  const subject =
    job.status === "FAILED"
      ? `Échec de génération · ${job.name}`
      : `${job.name} est prêt !`;

  const html = renderEmail({
    title:
      job.status === "FAILED"
        ? `La génération de ${job.name} a échoué`
        : `${job.name} est prêt à déployer`,
    firstName,
    body:
      job.status === "FAILED"
        ? `Détails : ${job.errorMessage ?? "erreur inconnue"}. Tu peux relancer depuis la console.`
        : `${job.endpoints ?? 0} endpoints générés${
            job.testsTotal && job.testsPassed
              ? ` · ${Math.round((job.testsPassed / job.testsTotal) * 100)} % de couverture de tests`
              : ""
          }. Tu peux passer au déploiement.`,
    cta: { label: "Ouvrir le job", url: `${APP_URL}/jobs/${job.id}` },
    isError: job.status === "FAILED",
  });

  await c.emails.send({
    from: FROM,
    to: job.user.email,
    subject,
    html,
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  url,
}: {
  to: string;
  name: string | null;
  url: string;
}): Promise<void> {
  const c = client();
  if (!c) return;

  const firstName = name?.split(/\s+/)[0] ?? "toi";
  const html = renderEmail({
    title: "Réinitialise ton mot de passe",
    firstName,
    body: "Tu as demandé à réinitialiser ton mot de passe ZeroAPI. Le lien est valable 30 minutes. Si ce n'était pas toi, ignore cet email.",
    cta: { label: "Choisir un nouveau mot de passe", url },
    isError: false,
  });

  await c.emails.send({
    from: FROM,
    to,
    subject: "Réinitialise ton mot de passe ZeroAPI",
    html,
  });
}

export async function sendEmailVerificationEmail({
  to,
  name,
  url,
}: {
  to: string;
  name: string | null;
  url: string;
}): Promise<void> {
  const c = client();
  if (!c) return;

  const firstName = name?.split(/\s+/)[0] ?? "toi";
  const html = renderEmail({
    title: "Vérifie ton adresse email",
    firstName,
    body: "Confirme ton adresse pour activer toutes les fonctionnalités de ZeroAPI. Ça nous évite les faux comptes et te permet de recevoir les notifications de jobs.",
    cta: { label: "Vérifier mon email", url },
    isError: false,
  });

  await c.emails.send({
    from: FROM,
    to,
    subject: "Vérifie ton email ZeroAPI",
    html,
  });
}

function renderEmail({
  title,
  firstName,
  body,
  cta,
  isError,
}: {
  title: string;
  firstName: string;
  body: string;
  cta: { label: string; url: string };
  isError: boolean;
}): string {
  const accent = isError ? "#D8453A" : "#10F083";
  const accentInk = isError ? "#fff" : "#002914";
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#FAFAF7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;color:#0A0A0A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
    <tr><td style="padding:0 0 24px;">
      <span style="display:inline-flex;align-items:center;gap:10px;font-weight:600;">
        <span style="display:inline-block;width:26px;height:26px;border-radius:7px;background:#0A0A0A;color:#fff;text-align:center;line-height:26px;font-family:'JetBrains Mono',monospace;">0</span>
        ZeroAPI
      </span>
    </td></tr>
    <tr><td style="background:#fff;border:1px solid #E5E4DE;border-radius:14px;padding:28px;">
      <h1 style="margin:0 0 12px;font-family:'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.1;">${escape(title)}.</h1>
      <p style="margin:0 0 6px;color:#6E6E68;font-size:14px;">Bonjour ${escape(firstName)},</p>
      <p style="margin:0 0 24px;color:#2A2A28;font-size:15px;line-height:1.55;">${escape(body)}</p>
      <a href="${cta.url}" style="display:inline-block;padding:12px 18px;background:${accent};color:${accentInk};text-decoration:none;border-radius:10px;font-weight:500;font-size:14px;">${escape(cta.label)} →</a>
    </td></tr>
    <tr><td style="padding:20px 0 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6E6E68;text-align:center;">
      © 2026 ZeroAPI · Dakar
    </td></tr>
  </table>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
