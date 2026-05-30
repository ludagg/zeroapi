import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import type { LanguageModel } from "ai";
import type { Plan } from "@prisma/client";

import { loadResolvedProviders, type ProviderId } from "@/lib/ai-providers";
import { loadResolvedRouting, type RoutingTask } from "@/lib/llm-routing-config";

/**
 * Vercel AI SDK bridge for the Kia agent.
 *
 * This layer exists ONLY to turn a `(provider, apiKey, model)` triple into a
 * Vercel AI SDK `LanguageModel` that supports unified, structured tool calling
 * across every provider (Claude, Mistral, Gemini, Groq).
 *
 * Key principle: the API key is **always** the one resolved from the database
 * by `loadResolvedProviders()` (DB → env fallback, decrypted, cached). It is
 * injected into the provider factory at call time. Nothing here reads a
 * hardcoded `process.env.*_API_KEY`; that resolution stays centralised in
 * `lib/ai-providers.ts`, exactly like `routeLLM` does for text/JSON.
 */

export type AgentModel = {
  provider: ProviderId;
  /** Model id resolved from the DB provider config (or its default). */
  model: string;
  /** Ready-to-use Vercel AI SDK model for `generateText` / `streamText`. */
  languageModel: LanguageModel;
};

/**
 * Pure mapping: build a Vercel AI SDK `LanguageModel` from an explicit
 * provider + DB-resolved API key + model id. No DB / env access here.
 *
 * Note the id mismatch: our internal provider id `"gemini"` maps to the
 * `@ai-sdk/google` (Google Generative AI) factory.
 */
export function buildLanguageModel(
  provider: ProviderId,
  apiKey: string,
  model: string,
): LanguageModel {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "mistral":
      return createMistral({ apiKey })(model);
    case "gemini":
      return createGoogleGenerativeAI({ apiKey })(model);
    case "groq":
      return createGroq({ apiKey })(model);
  }
}

/**
 * Resolve a single provider into a tool-calling-capable Vercel AI SDK model,
 * using the DB-resolved API key + model. Throws when the provider has no
 * usable key / is disabled.
 */
export async function resolveAgentModel(provider: ProviderId): Promise<AgentModel> {
  const providers = await loadResolvedProviders();
  const cfg = providers.find((p) => p.provider === provider);
  if (!cfg || !cfg.enabled || !cfg.apiKey) {
    throw new Error(
      `Provider ${provider} indisponible pour l'agent (clé manquante ou désactivé).`,
    );
  }
  return {
    provider,
    model: cfg.model,
    languageModel: buildLanguageModel(provider, cfg.apiKey, cfg.model),
  };
}

/**
 * Pick the first available provider for a `(plan, task)` pair by walking the
 * exact same routing order as `routeLLM` (`loadResolvedRouting`), then build
 * its Vercel AI SDK model. This reuses the existing routing + key resolution
 * so the agent honours the same admin-configured preferences and fallbacks as
 * the text/JSON path — only the call surface (tool calling) differs.
 */
export async function resolveAgentModelForTask(
  task: RoutingTask,
  userPlan: Plan,
): Promise<AgentModel> {
  const [providers, routing] = await Promise.all([
    loadResolvedProviders(),
    loadResolvedRouting(),
  ]);
  const byId = new Map(providers.map((p) => [p.provider, p]));
  const order = routing[userPlan]?.[task] ?? [];

  for (const providerId of order) {
    const cfg = byId.get(providerId);
    if (!cfg || !cfg.enabled || !cfg.apiKey) continue;
    return {
      provider: cfg.provider,
      model: cfg.model,
      languageModel: buildLanguageModel(cfg.provider, cfg.apiKey, cfg.model),
    };
  }

  throw new Error(
    `Aucun fournisseur LLM disponible pour l'agent (task=${task}, plan=${userPlan}).`,
  );
}
