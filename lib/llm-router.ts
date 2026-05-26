import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";
import type { Plan } from "@prisma/client";
import { loadResolvedProviders, type ProviderId } from "./ai-providers";
import { loadResolvedRouting, type RoutingTask } from "./llm-routing-config";
import { prisma } from "./prisma";

export type LLMTask = RoutingTask | "validation" | "complex_spec";

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMRequest = {
  task: LLMTask;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
};

export type LLMResponse = {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
  usage?: { inputTokens?: number; outputTokens?: number };
};

export interface LLMProvider {
  readonly name: ProviderId;
  generate(req: LLMRequest, ctx: { apiKey: string; model: string }): Promise<LLMResponse>;
}

const DEFAULT_SYSTEM = "Tu es l'assistant de ZeroAPI. Réponds en français, concis et précis.";

function splitSystem(messages: LLMMessage[]): { system: string; rest: LLMMessage[] } {
  const sys = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  return { system: sys || DEFAULT_SYSTEM, rest };
}

// ============ CLAUDE ============

export class ClaudeProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  async generate(req: LLMRequest, ctx: { apiKey: string; model: string }): Promise<LLMResponse> {
    const client = new Anthropic({ apiKey: ctx.apiKey });
    const { system, rest } = splitSystem(req.messages);
    const t0 = Date.now();
    const res = await client.messages.create({
      model: ctx.model,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature ?? (req.json ? 0.1 : 0.7),
      system: req.json
        ? `${system}\n\nRéponds UNIQUEMENT par du JSON valide, sans markdown.`
        : system,
      messages: rest.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    });
    const text = res.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
    return {
      content: text,
      provider: this.name,
      model: ctx.model,
      latencyMs: Date.now() - t0,
      usage: {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
      },
    };
  }
}

// ============ MISTRAL ============

export class MistralProvider implements LLMProvider {
  readonly name = "mistral" as const;
  async generate(req: LLMRequest, ctx: { apiKey: string; model: string }): Promise<LLMResponse> {
    const client = new Mistral({ apiKey: ctx.apiKey });
    const t0 = Date.now();
    const res = await client.chat.complete({
      model: ctx.model,
      maxTokens: req.maxTokens ?? 4096,
      temperature: req.temperature ?? (req.json ? 0.1 : 0.7),
      responseFormat: req.json ? { type: "json_object" } : undefined,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const choice = res.choices?.[0];
    const raw = choice?.message?.content;
    const text =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? raw.map((c) => ("text" in c ? c.text : "")).join("")
          : "";
    return {
      content: text,
      provider: this.name,
      model: ctx.model,
      latencyMs: Date.now() - t0,
      usage: {
        inputTokens: res.usage?.promptTokens,
        outputTokens: res.usage?.completionTokens,
      },
    };
  }
}

// ============ GEMINI ============

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  async generate(req: LLMRequest, ctx: { apiKey: string; model: string }): Promise<LLMResponse> {
    const client = new GoogleGenerativeAI(ctx.apiKey);
    const { system, rest } = splitSystem(req.messages);
    const model = client.getGenerativeModel({
      model: ctx.model,
      systemInstruction: req.json
        ? `${system}\n\nRéponds UNIQUEMENT par du JSON valide, sans markdown.`
        : system,
      generationConfig: {
        maxOutputTokens: req.maxTokens ?? 4096,
        temperature: req.temperature ?? (req.json ? 0.1 : 0.7),
        responseMimeType: req.json ? "application/json" : "text/plain",
      },
    });
    const t0 = Date.now();
    const res = await model.generateContent({
      contents: rest.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    });
    return {
      content: res.response.text(),
      provider: this.name,
      model: ctx.model,
      latencyMs: Date.now() - t0,
      usage: {
        inputTokens: res.response.usageMetadata?.promptTokenCount,
        outputTokens: res.response.usageMetadata?.candidatesTokenCount,
      },
    };
  }
}

// ============ GROQ (OpenAI-compatible via fetch) ============

export class GroqProvider implements LLMProvider {
  readonly name = "groq" as const;
  async generate(req: LLMRequest, ctx: { apiKey: string; model: string }): Promise<LLMResponse> {
    const t0 = Date.now();
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ctx.apiKey}`,
      },
      body: JSON.stringify({
        model: ctx.model,
        messages: req.messages,
        max_tokens: req.maxTokens ?? 4096,
        temperature: req.temperature ?? (req.json ? 0.1 : 0.7),
        ...(req.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      content: data.choices[0]?.message?.content ?? "",
      provider: this.name,
      model: ctx.model,
      latencyMs: Date.now() - t0,
      usage: {
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
      },
    };
  }
}

// ============ REGISTRY ============

const REGISTRY: Record<ProviderId, LLMProvider> = {
  anthropic: new ClaudeProvider(),
  mistral: new MistralProvider(),
  gemini: new GeminiProvider(),
  groq: new GroqProvider(),
};

export function getProviderImpl(id: ProviderId): LLMProvider {
  return REGISTRY[id];
}

export async function listProviderAvailability(): Promise<
  Array<{ name: ProviderId; available: boolean }>
> {
  const resolved = await loadResolvedProviders();
  return resolved.map((r) => ({ name: r.provider, available: r.enabled }));
}

// ============ ROUTER ============

export type RouteContext = {
  /** When set, the chosen provider/model is logged into AgentLog. */
  jobId?: string;
  /** Agent name used as `AgentLog.agent`. Defaults to the task name. */
  agent?: string;
};

/**
 * Routes an LLM request using:
 *   1. The DB routing matrix (with 5-min cache) for the (plan, task) pair
 *   2. The hardcoded fallback list when DB is empty / unreachable
 *   3. Provider API keys from DB (decrypted) with env fallback
 *
 * On error, tries the next provider in order. Logs the chosen provider in
 * AgentLog when `ctx.jobId` is provided.
 */
export async function routeLLM(
  task: LLMTask,
  userPlan: Plan,
  req: Omit<LLMRequest, "task">,
  ctx: RouteContext = {},
): Promise<LLMResponse> {
  const [providers, routing] = await Promise.all([
    loadResolvedProviders(),
    loadResolvedRouting(),
  ]);

  const byId = new Map(providers.map((p) => [p.provider, p]));

  // Some tasks (validation / complex_spec) reuse the spec_generation route.
  const routingKey: RoutingTask = task === "conversation" ? "conversation" : "spec_generation";
  const order = routing[userPlan]?.[routingKey] ?? [];

  const errors: Array<{ provider: ProviderId; error: string }> = [];

  for (const providerId of order) {
    const cfg = byId.get(providerId);
    if (!cfg || !cfg.enabled || !cfg.apiKey) continue;
    try {
      const impl = getProviderImpl(providerId);
      const res = await impl.generate(
        { task, ...req },
        { apiKey: cfg.apiKey, model: cfg.model },
      );
      if (ctx.jobId) {
        await logProviderUse(ctx.jobId, ctx.agent ?? task, res);
      }
      return res;
    } catch (err) {
      errors.push({
        provider: providerId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  throw new Error(
    `Aucun fournisseur LLM disponible pour task=${task} plan=${userPlan}. Erreurs : ` +
      (errors.length ? errors.map((e) => `${e.provider}: ${e.error}`).join(" | ") : "aucun provider activé"),
  );
}

async function logProviderUse(
  jobId: string,
  agent: string,
  res: LLMResponse,
): Promise<void> {
  await prisma.agentLog
    .create({
      data: {
        jobId,
        agent,
        status: "done",
        message: `${res.provider}/${res.model}`,
        duration: res.latencyMs,
      },
    })
    .catch(() => undefined);
}
