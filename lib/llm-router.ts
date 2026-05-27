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

export type LLMStreamChunk =
  | { type: "text"; text: string }
  | { type: "done"; usage?: { inputTokens?: number; outputTokens?: number } };

export interface LLMProvider {
  readonly name: ProviderId;
  generate(req: LLMRequest, ctx: { apiKey: string; model: string }): Promise<LLMResponse>;
  stream?(
    req: LLMRequest,
    ctx: { apiKey: string; model: string },
  ): AsyncIterable<LLMStreamChunk>;
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

  async *stream(
    req: LLMRequest,
    ctx: { apiKey: string; model: string },
  ): AsyncIterable<LLMStreamChunk> {
    const client = new Anthropic({ apiKey: ctx.apiKey });
    const { system, rest } = splitSystem(req.messages);
    const it = client.messages.stream({
      model: ctx.model,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature ?? 0.7,
      system,
      messages: rest.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    });
    for await (const event of it) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { type: "text", text: event.delta.text };
      }
    }
    const final = await it.finalMessage();
    yield {
      type: "done",
      usage: {
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
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

  async *stream(
    req: LLMRequest,
    ctx: { apiKey: string; model: string },
  ): AsyncIterable<LLMStreamChunk> {
    const client = new Mistral({ apiKey: ctx.apiKey });
    const it = await client.chat.stream({
      model: ctx.model,
      maxTokens: req.maxTokens ?? 4096,
      temperature: req.temperature ?? 0.7,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    let usage: { inputTokens?: number; outputTokens?: number } | undefined;
    for await (const event of it) {
      const delta = event.data?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) {
        yield { type: "text", text: delta };
      } else if (Array.isArray(delta)) {
        for (const c of delta) {
          if (c.type === "text" && typeof c.text === "string") {
            yield { type: "text", text: c.text };
          }
        }
      }
      if (event.data?.usage) {
        usage = {
          inputTokens: event.data.usage.promptTokens,
          outputTokens: event.data.usage.completionTokens,
        };
      }
    }
    yield { type: "done", usage };
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

  async *stream(
    req: LLMRequest,
    ctx: { apiKey: string; model: string },
  ): AsyncIterable<LLMStreamChunk> {
    const client = new GoogleGenerativeAI(ctx.apiKey);
    const { system, rest } = splitSystem(req.messages);
    const model = client.getGenerativeModel({
      model: ctx.model,
      systemInstruction: system,
      generationConfig: {
        maxOutputTokens: req.maxTokens ?? 4096,
        temperature: req.temperature ?? 0.7,
      },
    });
    const res = await model.generateContentStream({
      contents: rest.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    });
    for await (const chunk of res.stream) {
      const text = chunk.text();
      if (text) yield { type: "text", text };
    }
    const final = await res.response;
    yield {
      type: "done",
      usage: {
        inputTokens: final.usageMetadata?.promptTokenCount,
        outputTokens: final.usageMetadata?.candidatesTokenCount,
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

  async *stream(
    req: LLMRequest,
    ctx: { apiKey: string; model: string },
  ): AsyncIterable<LLMStreamChunk> {
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
        temperature: req.temperature ?? 0.7,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) {
      throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let usage: { inputTokens?: number; outputTokens?: number } | undefined;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) yield { type: "text", text };
          if (parsed.usage) {
            usage = {
              inputTokens: parsed.usage.prompt_tokens,
              outputTokens: parsed.usage.completion_tokens,
            };
          }
        } catch {
          // ignore malformed SSE frames
        }
      }
    }
    yield { type: "done", usage };
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

export type StreamRouteResult = {
  provider: ProviderId;
  model: string;
  stream: AsyncIterable<LLMStreamChunk>;
};

/**
 * Routes a streaming LLM request. Walks the same fallback order as
 * `routeLLM`. To detect a provider before yielding chunks we pull the first
 * non-empty text chunk before returning the iterable — once a chunk has
 * arrived we know the provider is healthy and can stream the rest.
 */
export async function routeLLMStream(
  task: LLMTask,
  userPlan: Plan,
  req: Omit<LLMRequest, "task">,
): Promise<StreamRouteResult> {
  const [providers, routing] = await Promise.all([
    loadResolvedProviders(),
    loadResolvedRouting(),
  ]);
  const byId = new Map(providers.map((p) => [p.provider, p]));
  const routingKey: RoutingTask = task === "conversation" ? "conversation" : "spec_generation";
  const order = routing[userPlan]?.[routingKey] ?? [];

  const errors: Array<{ provider: ProviderId; error: string }> = [];

  for (const providerId of order) {
    const cfg = byId.get(providerId);
    if (!cfg || !cfg.enabled || !cfg.apiKey) continue;
    const impl = getProviderImpl(providerId);
    if (!impl.stream) continue;
    try {
      const iter = impl.stream({ task, ...req }, { apiKey: cfg.apiKey, model: cfg.model });
      const first = await pullFirstChunk(iter);
      if (first.ok === false) {
        errors.push({ provider: providerId, error: first.error });
        continue;
      }
      return {
        provider: providerId,
        model: cfg.model,
        stream: prependChunks(first.chunks, first.rest),
      };
    } catch (err) {
      errors.push({
        provider: providerId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  throw new Error(
    `Aucun fournisseur LLM streaming disponible pour task=${task} plan=${userPlan}. Erreurs : ` +
      (errors.length
        ? errors.map((e) => `${e.provider}: ${e.error}`).join(" | ")
        : "aucun provider activé"),
  );
}

type PullResult =
  | { ok: false; error: string }
  | { ok: true; chunks: LLMStreamChunk[]; rest: AsyncIterator<LLMStreamChunk> };

async function pullFirstChunk(iter: AsyncIterable<LLMStreamChunk>): Promise<PullResult> {
  const iterator = iter[Symbol.asyncIterator]();
  try {
    const collected: LLMStreamChunk[] = [];
    while (true) {
      const { value, done } = await iterator.next();
      if (done) {
        // Iterator finished without producing any chunk.
        return { ok: true, chunks: collected, rest: iterator };
      }
      collected.push(value);
      if (value.type === "text" || value.type === "done") {
        return { ok: true, chunks: collected, rest: iterator };
      }
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function* prependChunks(
  prefix: LLMStreamChunk[],
  rest: AsyncIterator<LLMStreamChunk>,
): AsyncIterable<LLMStreamChunk> {
  for (const c of prefix) yield c;
  while (true) {
    const { value, done } = await rest.next();
    if (done) return;
    yield value;
  }
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
