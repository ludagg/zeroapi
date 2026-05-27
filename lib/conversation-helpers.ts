import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { ConversationMessage } from "./spec";
import { readSpec } from "./job-helpers";
import type { Prisma } from "@prisma/client";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  ts?: number;
  meta?: string;
};

// ============ MESSAGES (JSON) ============

export function parseMessages(raw: Prisma.JsonValue | null | undefined): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((m): ChatMessage[] => {
    if (!m || typeof m !== "object") return [];
    const msg = m as Record<string, unknown>;
    if (msg.role !== "user" && msg.role !== "assistant") return [];
    if (typeof msg.content !== "string") return [];
    return [
      {
        role: msg.role,
        content: msg.content,
        ts: typeof msg.ts === "number" ? msg.ts : undefined,
        meta: typeof msg.meta === "string" ? msg.meta : undefined,
      },
    ];
  });
}

export function lastMessageExcerpt(messages: ChatMessage[], maxLen = 140): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const t = m.content.trim();
    if (!t) continue;
    if (t.length <= maxLen) return t;
    return t.slice(0, maxLen - 1).trimEnd() + "…";
  }
  return "";
}

// ============ CONFIDENCE & SIDEBAR DATA ============

export type ConversationInsights = {
  /** 0–100. Computed from spec if available, else estimated from conversation. */
  confidence: number;
  /** Authentication strategy detected. */
  authStrategy: "JWT" | "OAuth" | "API Key" | "Bearer" | "Aucune" | "Non précisé";
  /** Roles (RBAC) names. */
  roles: string[];
  /** Rate limit, e.g. "120 req / 60s". */
  rateLimit: string | null;
  /** Counts derived from the spec or estimated. */
  resourcesCount: number;
  endpointsCount: number;
  /** True once a spec is parsed and complete enough to ship. */
  specReady: boolean;
  /** Short tagline for the "Modèle détecté" card. */
  summary: string;
};

const AUTH_KEYWORDS: Array<[RegExp, ConversationInsights["authStrategy"]]> = [
  [/\bjwt\b|json web token/i, "JWT"],
  [/oauth|openid|connect/i, "OAuth"],
  [/api[\s-]?key|apikey/i, "API Key"],
  [/bearer\s*token|bearer/i, "Bearer"],
  [/(public|sans auth|no auth|pas d['']auth)/i, "Aucune"],
];

const ROLE_KEYWORDS = [
  "admin",
  "user",
  "manager",
  "moderator",
  "owner",
  "guest",
  "client",
  "vendeur",
  "acheteur",
  "courier",
  "livreur",
];

export function detectAuthStrategy(text: string): ConversationInsights["authStrategy"] {
  for (const [re, value] of AUTH_KEYWORDS) {
    if (re.test(text)) return value;
  }
  return "Non précisé";
}

export function detectRoles(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const role of ROLE_KEYWORDS) {
    if (new RegExp(`\\b${role}s?\\b`, "i").test(lower)) {
      if (!out.includes(role)) out.push(role);
    }
  }
  return out;
}

export function detectRateLimit(text: string): string | null {
  const m = text.match(/(\d{2,5})\s*(?:req|requ[êe]tes?)?\s*\/\s*(?:min|minute|s|seconde|sec)/i);
  if (m) {
    const max = Number.parseInt(m[1], 10);
    const window = /min|minute/i.test(m[0]) ? 60 : 1;
    return `${max} req / ${window}s`;
  }
  return null;
}

export function estimateConfidence(messages: ChatMessage[]): number {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return 0;
  const totalChars = userMessages.reduce((sum, m) => sum + m.content.length, 0);
  let score = 15 + Math.min(45, userMessages.length * 10);
  if (totalChars > 200) score += 12;
  if (totalChars > 500) score += 10;
  if (totalChars > 1000) score += 8;
  const text = messages.map((m) => m.content).join("\n");
  if (detectAuthStrategy(text) !== "Non précisé") score += 5;
  if (detectRoles(text).length >= 2) score += 5;
  if (detectRateLimit(text)) score += 2;
  if (/resource|ressource|entité|model|table/i.test(text)) score += 5;
  return Math.min(94, score);
}

export function computeInsights(
  messages: ChatMessage[],
  spec: ZeroAPISpec | null,
): ConversationInsights {
  if (spec) {
    const resourcesCount = spec.resources.length;
    let endpointsCount = 0;
    for (const r of spec.resources) {
      endpointsCount += (r.endpoints ?? ["list", "create", "read", "update", "delete"]).length;
      endpointsCount += r.customEndpoints?.length ?? 0;
    }
    const auth = spec.auth?.strategy?.toUpperCase();
    const authStrategy: ConversationInsights["authStrategy"] =
      auth === "JWT" ? "JWT" : auth === "BEARER" ? "Bearer" : auth === "APIKEY" ? "API Key" : "Aucune";
    const roles = spec.roles?.map((r) => r.name) ?? [];
    const rateLimit = spec.rateLimit
      ? `${spec.rateLimit.max} req / ${Math.round(spec.rateLimit.windowMs / 1000)}s`
      : null;
    return {
      confidence: 100,
      authStrategy,
      roles,
      rateLimit,
      resourcesCount,
      endpointsCount,
      specReady: true,
      summary: buildSummary(resourcesCount, authStrategy, endpointsCount),
    };
  }

  const text = messages.map((m) => m.content).join("\n");
  const confidence = estimateConfidence(messages);
  const authStrategy = detectAuthStrategy(text);
  const roles = detectRoles(text);
  const rateLimit = detectRateLimit(text);
  const resourceMatches = text.match(/(?:resource|ressource|entit[ée]|model|table|fiche)/gi);
  const resourcesCount = Math.max(0, Math.min(8, Math.round((resourceMatches?.length ?? 0) / 2)));
  const endpointsCount = resourcesCount * 5;
  return {
    confidence,
    authStrategy,
    roles,
    rateLimit,
    resourcesCount,
    endpointsCount,
    specReady: false,
    summary:
      resourcesCount > 0
        ? buildSummary(resourcesCount, authStrategy, endpointsCount)
        : "Décris encore quelques détails…",
  };
}

function buildSummary(
  resources: number,
  auth: ConversationInsights["authStrategy"],
  endpoints: number,
): string {
  const parts: string[] = [];
  if (resources > 0) parts.push(`${resources} ressource${resources > 1 ? "s" : ""}`);
  if (auth !== "Non précisé" && auth !== "Aucune") parts.push(auth);
  if (endpoints > 0) parts.push(`${endpoints} endpoint${endpoints > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

export function confidenceTone(c: number): "high" | "med" | "low" {
  if (c >= 80) return "high";
  if (c >= 50) return "med";
  return "low";
}

// ============ TITLE ============

const TITLE_STOPWORDS = new Set([
  "je",
  "j'ai",
  "j'aimerais",
  "veux",
  "voudrais",
  "souhaite",
  "besoin",
  "faire",
  "créer",
  "construire",
  "developper",
  "développer",
  "un",
  "une",
  "des",
  "de",
  "du",
  "la",
  "le",
  "les",
  "mon",
  "ma",
  "mes",
  "pour",
  "avec",
  "et",
  "ou",
  "the",
  "a",
  "i",
  "want",
  "need",
  "to",
  "build",
  "make",
  "an",
  "api",
  "app",
  "application",
  "backend",
]);

/** Best-effort title from the first user message. */
export function provisionalTitle(message: string): string {
  const cleaned = message
    .replace(/[\n\r]+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim();
  if (!cleaned) return "Nouvelle conversation";
  const words = cleaned.split(/\s+/);
  const kept: string[] = [];
  for (const w of words) {
    if (kept.length >= 6) break;
    if (TITLE_STOPWORDS.has(w.toLowerCase()) && kept.length === 0) continue;
    if (w.length < 2) continue;
    kept.push(w);
  }
  const out = kept.join(" ");
  if (!out) return cleaned.slice(0, 60);
  return out.length > 60 ? out.slice(0, 57).trimEnd() + "…" : out;
}

export const TITLE_SYSTEM_PROMPT = `Tu génères un TITRE court (3–5 mots, sans ponctuation finale)
pour une conversation où l'utilisateur décrit l'API qu'il veut générer.
Format attendu : juste le titre brut, sans guillemets, sans préfixe.
Exemples :
- "Marketplace de location"
- "Plateforme de cours en ligne"
- "Application livraison express"
Réponds UNIQUEMENT par le titre, rien d'autre.`;

// ============ DIFF (between an old spec and a new spec) ============

export type SpecDiff = {
  added: string[];
  modified: string[];
  removed: string[];
};

export function diffSpecs(prev: ZeroAPISpec | null, next: ZeroAPISpec): SpecDiff {
  const out: SpecDiff = { added: [], modified: [], removed: [] };
  const prevResources = new Map<string, ZeroAPISpec["resources"][number]>();
  if (prev) {
    for (const r of prev.resources) prevResources.set(r.name, r);
  }
  const nextNames = new Set(next.resources.map((r) => r.name));

  for (const r of next.resources) {
    const before = prevResources.get(r.name);
    if (!before) {
      out.added.push(`Ressource ${r.name}`);
    } else if (JSON.stringify(before) !== JSON.stringify(r)) {
      out.modified.push(`Ressource ${r.name}`);
    }
  }

  if (prev) {
    for (const r of prev.resources) {
      if (!nextNames.has(r.name)) {
        out.removed.push(`Ressource ${r.name}`);
      }
    }
    if (JSON.stringify(prev.auth) !== JSON.stringify(next.auth)) {
      out.modified.push("Stratégie d'authentification");
    }
    if (JSON.stringify(prev.roles) !== JSON.stringify(next.roles)) {
      out.modified.push("Rôles RBAC");
    }
    if (JSON.stringify(prev.rateLimit) !== JSON.stringify(next.rateLimit)) {
      out.modified.push("Rate limit");
    }
  } else {
    if (next.auth?.strategy) out.added.push("Stratégie d'authentification");
    if (next.roles?.length) out.added.push("Rôles RBAC");
    if (next.rateLimit) out.added.push("Rate limit");
  }

  return out;
}

// ============ SPEC accessor ============

export { readSpec };

// ============ Limits ============

export const MAX_MESSAGES_PER_CONVERSATION = 80;
