import { prisma } from "./prisma";
import { cacheDel, cacheGet, cacheSet } from "./cache";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto-secrets";

export const PROVIDER_IDS = ["anthropic", "mistral", "gemini", "groq"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PROVIDER_META: Record<
  ProviderId,
  { label: string; defaultModel: string; docs: string; envFallback: string }
> = {
  anthropic: {
    label: "Anthropic Claude",
    defaultModel: "claude-sonnet-4-6",
    docs: "https://console.anthropic.com/settings/keys",
    envFallback: "ANTHROPIC_API_KEY",
  },
  mistral: {
    label: "Mistral AI",
    defaultModel: "mistral-large-latest",
    docs: "https://console.mistral.ai/api-keys",
    envFallback: "MISTRAL_API_KEY",
  },
  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-2.5-pro",
    docs: "https://aistudio.google.com/apikey",
    envFallback: "GEMINI_API_KEY",
  },
  groq: {
    label: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    docs: "https://console.groq.com/keys",
    envFallback: "GROQ_API_KEY",
  },
};

const PROVIDERS_CACHE_KEY = "zeroapi:ai-providers:v1";
const PROVIDERS_CACHE_TTL = 60 * 5;

export type ResolvedProvider = {
  provider: ProviderId;
  apiKey: string | null;
  model: string;
  enabled: boolean;
  source: "db" | "env" | "none";
};

/**
 * Returns the resolved configuration for every known provider.
 * DB wins over env, env wins over nothing. Decrypted API keys are
 * cached in Redis for PROVIDERS_CACHE_TTL seconds.
 */
export async function loadResolvedProviders(): Promise<ResolvedProvider[]> {
  const cached = await cacheGet(PROVIDERS_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as ResolvedProvider[];
    } catch {
      // bad cache → fall through
    }
  }

  const rows = await prisma.aIProviderConfig
    .findMany()
    .catch(() => [] as Awaited<ReturnType<typeof prisma.aIProviderConfig.findMany>>);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  const out: ResolvedProvider[] = await Promise.all(
    PROVIDER_IDS.map(async (id): Promise<ResolvedProvider> => {
      const row = byProvider.get(id);
      if (row) {
        let apiKey: string | null = null;
        try {
          apiKey = await decryptSecret(row.apiKey);
        } catch {
          apiKey = null;
        }
        return {
          provider: id,
          apiKey,
          model: row.model || PROVIDER_META[id].defaultModel,
          enabled: row.enabled && Boolean(apiKey),
          source: apiKey ? "db" : "none",
        };
      }
      const envKey = process.env[PROVIDER_META[id].envFallback];
      return {
        provider: id,
        apiKey: envKey ?? null,
        model: PROVIDER_META[id].defaultModel,
        enabled: Boolean(envKey),
        source: envKey ? "env" : "none",
      };
    }),
  );

  await cacheSet(PROVIDERS_CACHE_KEY, JSON.stringify(out), PROVIDERS_CACHE_TTL);
  return out;
}

export async function invalidateProvidersCache(): Promise<void> {
  await cacheDel(PROVIDERS_CACHE_KEY);
}

/**
 * Admin-facing view of provider configs. The raw API key never leaves the
 * server — only a masked version is returned.
 */
export type ProviderAdminView = {
  provider: ProviderId;
  label: string;
  model: string;
  defaultModel: string;
  enabled: boolean;
  hasKey: boolean;
  keyMask: string | null;
  source: "db" | "env" | "none";
  docs: string;
  updatedAt: string | null;
};

export async function listProvidersForAdmin(): Promise<ProviderAdminView[]> {
  const resolved = await loadResolvedProviders();
  const rows = await prisma.aIProviderConfig.findMany({
    select: { provider: true, updatedAt: true },
  });
  const updatedAt = new Map(rows.map((r) => [r.provider, r.updatedAt.toISOString()]));

  return resolved.map((r) => ({
    provider: r.provider,
    label: PROVIDER_META[r.provider].label,
    model: r.model,
    defaultModel: PROVIDER_META[r.provider].defaultModel,
    enabled: r.enabled,
    hasKey: r.apiKey !== null,
    keyMask: r.apiKey ? maskSecret(r.apiKey) : null,
    source: r.source,
    docs: PROVIDER_META[r.provider].docs,
    updatedAt: updatedAt.get(r.provider) ?? null,
  }));
}

export async function saveProviderConfig(input: {
  provider: ProviderId;
  apiKey: string;
  model: string;
}): Promise<void> {
  const encrypted = await encryptSecret(input.apiKey);
  await prisma.aIProviderConfig.upsert({
    where: { provider: input.provider },
    create: {
      provider: input.provider,
      apiKey: encrypted,
      model: input.model || PROVIDER_META[input.provider].defaultModel,
      enabled: true,
    },
    update: {
      apiKey: encrypted,
      model: input.model || PROVIDER_META[input.provider].defaultModel,
    },
  });
  await invalidateProvidersCache();
}

export async function toggleProviderEnabled(
  provider: ProviderId,
  enabled: boolean,
): Promise<void> {
  await prisma.aIProviderConfig.upsert({
    where: { provider },
    create: {
      provider,
      apiKey: "",
      model: PROVIDER_META[provider].defaultModel,
      enabled,
    },
    update: { enabled },
  });
  await invalidateProvidersCache();
}

export async function getProviderApiKey(provider: ProviderId): Promise<string | null> {
  const all = await loadResolvedProviders();
  return all.find((p) => p.provider === provider)?.apiKey ?? null;
}

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}
