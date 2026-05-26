import { getProviderImpl } from "./llm-router";
import { PROVIDER_META, type ProviderId } from "./ai-providers";

export type ProviderTestResult =
  | { ok: true; provider: ProviderId; model: string; latencyMs: number; preview: string }
  | { ok: false; provider: ProviderId; model: string; latencyMs: number; error: string };

/**
 * Sends a tiny ping prompt to the provider with the given apiKey/model and
 * reports latency. Used by the admin "Tester la connexion" button — the
 * key is taken from the form, not from cache, so admins can validate
 * *before* persisting.
 */
export async function testProviderConnection(args: {
  provider: ProviderId;
  apiKey: string;
  model?: string;
}): Promise<ProviderTestResult> {
  const model = args.model || PROVIDER_META[args.provider].defaultModel;
  const t0 = Date.now();
  try {
    const impl = getProviderImpl(args.provider);
    const res = await impl.generate(
      {
        task: "conversation",
        messages: [
          { role: "system", content: "Tu es un service de ping. Réponds par OK uniquement." },
          { role: "user", content: "ping" },
        ],
        maxTokens: 8,
        temperature: 0,
      },
      { apiKey: args.apiKey, model },
    );
    return {
      ok: true,
      provider: args.provider,
      model,
      latencyMs: res.latencyMs,
      preview: res.content.slice(0, 40).trim() || "(réponse vide)",
    };
  } catch (err) {
    return {
      ok: false,
      provider: args.provider,
      model,
      latencyMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
