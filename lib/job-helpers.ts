import type { Job } from "@prisma/client";

const EMOJI_BY_KEYWORD: Array<[RegExp, string]> = [
  [/livr|delivery|courier|transport/i, "🚛"],
  [/commerce|shop|boutique|panier/i, "🛒"],
  [/stock|invent|warehouse/i, "📦"],
  [/reserv|booking|rendez|agenda/i, "📅"],
  [/chat|message|forum|discussion/i, "💬"],
  [/cours|lms|quiz|formation|école/i, "🎓"],
  [/bus|transport|trajet/i, "🚌"],
  [/agric|ferme|récolte/i, "🌾"],
  [/santé|médic|health|patient/i, "🩺"],
  [/finance|paie|wallet|momo/i, "💸"],
];

export function pickEmoji(text: string): string {
  for (const [re, emoji] of EMOJI_BY_KEYWORD) {
    if (re.test(text)) return emoji;
  }
  return "✦";
}

export function extractVersion(job: Pick<Job, "createdAt" | "name">): string {
  const match = job.name.match(/v(\d+\.\d+|\d+)/i);
  if (match) return match[0].toLowerCase();
  return "v1.0";
}

export function extractAuthMode(spec: Job["spec"]): string | null {
  if (!spec || typeof spec !== "object") return null;
  const s = spec as { auth?: { type?: string; rbac?: boolean }; security?: { auth?: string } };
  if (s.auth?.type) return s.auth.rbac ? "JWT+RBAC" : s.auth.type.toUpperCase();
  if (s.security?.auth) return s.security.auth.toUpperCase();
  return null;
}
