import type { Job } from "@prisma/client";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

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

function asPartialSpec(spec: Job["spec"]): Partial<ZeroAPISpec> | null {
  if (!spec || typeof spec !== "object") return null;
  return spec as Partial<ZeroAPISpec>;
}

export function extractAuthMode(spec: Job["spec"]): string | null {
  const s = asPartialSpec(spec);
  if (!s) return null;
  if (s.auth?.strategy) {
    const strat = s.auth.strategy.toUpperCase();
    const hasRoles = (s.roles?.length ?? 0) > 0;
    return hasRoles ? `${strat}+RBAC` : strat;
  }
  return null;
}

export function readSpec(spec: Job["spec"]): ZeroAPISpec | null {
  const s = asPartialSpec(spec);
  if (!s || !s.name || !s.resources) return null;
  return s as ZeroAPISpec;
}
