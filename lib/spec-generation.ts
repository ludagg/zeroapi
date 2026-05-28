import type { Plan } from "@prisma/client";
import { routeLLM } from "./llm-router";
import { SPEC_SYSTEM_PROMPT, safeParseSpec, type ZeroAPISpec } from "./spec";

const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 8192;
const TEMPERATURE = 0.1;

/** Information about the LLM call that produced the spec — surfaced to the
 *  `agentLog` row alongside the job. */
export type SpecGenInfo = { provider: string; model: string; latencyMs: number };

export type SpecGenResult = { spec: ZeroAPISpec; info: SpecGenInfo };

export type SpecGenHistoryMessage = { role: "user" | "assistant"; content: string };

/**
 * Calls the spec_generation LLM with hardened settings and retries on parse
 * failure. The flow per attempt:
 *
 *   1. Issue the call with `json: true` + `maxTokens: 8192` (vs the previous
 *      4096 — the JSON of a complex spec was often truncated).
 *   2. Run the response through `safeParseSpec`, which itself attempts
 *      `tryRepairJson` on truncated output before giving up.
 *   3. On failure, capture the error, log the raw output for debugging, and
 *      retry up to {@link MAX_ATTEMPTS} times. The reminder message on retries
 *      explicitly tells the model its previous output was invalid and asks
 *      for JSON only.
 *
 * Returns the parsed spec + provider/model info. Throws only when every
 * attempt has been exhausted — the last error is preserved.
 *
 * @param systemPrompt System prompt to send. Defaults to {@link SPEC_SYSTEM_PROMPT}.
 *                     Callers that need an anchored modification flow can
 *                     pre-concatenate `buildModificationSystemPrompt(...)`.
 */
export async function generateAndParseSpec(
  plan: Plan,
  history: SpecGenHistoryMessage[],
  options: { systemPrompt?: string } = {},
): Promise<SpecGenResult> {
  const systemPrompt = options.systemPrompt ?? SPEC_SYSTEM_PROMPT;
  let lastError: Error | null = null;
  let lastRaw: string | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const reminder =
      attempt === 1
        ? "Génère maintenant la spec JSON finale conforme au schéma. Réponds en JSON pur, sans markdown."
        : "Ta réponse précédente était un JSON INVALIDE (parseur ZeroAPI rejetté). Renvoie UNIQUEMENT un objet JSON complet : depuis `{` jusqu'à `}`, sans markdown, sans phrase d'intro/outro, sans virgule trailing. Vérifie que toutes les chaînes sont fermées et que toutes les accolades sont équilibrées.";

    let raw = "";
    try {
      const res = await routeLLM("spec_generation", plan, {
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: reminder },
        ],
        maxTokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        json: true,
      });
      raw = res.content;
      lastRaw = raw;
      const spec = safeParseSpec(raw);
      return {
        spec,
        info: { provider: res.provider, model: res.model, latencyMs: res.latencyMs },
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const preview = (raw || "")
        .slice(0, 600)
        .replace(/\s+/g, " ")
        .trim();
      console.error(
        `[spec_generation] attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError.message}` +
          (preview ? ` | raw[0..600]="${preview}"` : ""),
      );
    }
  }

  throw (
    lastError ??
    new Error("Échec inconnu de génération de Spec — aucun fournisseur LLM n'a répondu.")
  );
}
