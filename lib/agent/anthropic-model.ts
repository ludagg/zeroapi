/**
 * Anthropic native tool-calling adapter.
 *
 * Wraps the Anthropic SDK (already installed, 0.32) as a `ToolCallingModel` for
 * the agent loop. The API key/model are resolved from the EXISTING provider
 * resolution (`loadResolvedProviders`) so key management & multi-provider infra
 * stay centralised — only the tool-calling loop itself runs on Anthropic
 * (OPERATIONS.md §4.1: reuse keys/routing, do not add a second router).
 */

import Anthropic from "@anthropic-ai/sdk";
import { getProviderApiKey, PROVIDER_META } from "../ai-providers";
import { loadResolvedProviders } from "../ai-providers";
import type {
  AgentAssistantBlock,
  AgentMessage,
  ModelResponse,
  ToolCallingModel,
} from "./spec-agent";
import type { ToolDefinition } from "./tools";

export interface AnthropicModelOptions {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

/** Builds a `ToolCallingModel` backed by the Anthropic SDK. */
export function createAnthropicModel(opts: AnthropicModelOptions): ToolCallingModel {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const maxTokens = opts.maxTokens ?? 2048;
  const temperature = opts.temperature ?? 0.2;

  return {
    async generate({ system, messages, tools }): Promise<ModelResponse> {
      const res = await client.messages.create({
        model: opts.model,
        max_tokens: maxTokens,
        temperature,
        system,
        tools: tools as unknown as Anthropic.Tool[],
        tool_choice: { type: "auto" },
        messages: messages as unknown as Anthropic.MessageParam[],
      });

      const content: AgentAssistantBlock[] = [];
      for (const block of res.content) {
        if (block.type === "text") {
          content.push({ type: "text", text: block.text });
        } else if (block.type === "tool_use") {
          content.push({ type: "tool_use", id: block.id, name: block.name, input: block.input });
        }
      }
      return {
        content,
        stopReason: res.stop_reason,
        usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
      };
    },
  };
}

/**
 * Resolves the Anthropic provider (DB key, else env fallback) and builds the
 * model. Throws a clear French error when no key is configured.
 */
export async function resolveAnthropicModel(
  overrides: Partial<Omit<AnthropicModelOptions, "apiKey">> = {},
): Promise<ToolCallingModel> {
  const apiKey = await getProviderApiKey("anthropic");
  if (!apiKey) {
    throw new Error(
      "Aucune clé Anthropic configurée — l'agent de modification nécessite l'API Anthropic (tool calling).",
    );
  }
  const resolved = await loadResolvedProviders();
  const model =
    overrides.model ??
    resolved.find((p) => p.provider === "anthropic")?.model ??
    PROVIDER_META.anthropic.defaultModel;
  return createAnthropicModel({ apiKey, model, ...overrides });
}
