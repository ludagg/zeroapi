import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";
import type { Plan } from "@prisma/client";

export type LLMTask = "conversation" | "spec_generation" | "validation" | "complex_spec";

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
  usage?: { inputTokens?: number; outputTokens?: number };
};

export interface LLMProvider {
  readonly name: string;
  readonly available: boolean;
  generate(req: LLMRequest): Promise<LLMResponse>;
}

const DEFAULT_SYSTEM = "Tu es l'assistant de ZeroAPI. Réponds en français, concis et précis.";

function splitSystem(messages: LLMMessage[]): { system: string; rest: LLMMessage[] } {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  return { system: sys || DEFAULT_SYSTEM, rest };
}

// ============ CLAUDE ============

const CLAUDE_MODELS: Record<LLMTask, string> = {
  conversation: "claude-haiku-4-5-20251001",
  validation: "claude-haiku-4-5-20251001",
  spec_generation: "claude-sonnet-4-6",
  complex_spec: "claude-opus-4-7",
};

export class ClaudeProvider implements LLMProvider {
  readonly name = "claude";
  readonly available: boolean;
  private client: Anthropic | null;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    this.available = Boolean(apiKey);
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    if (!this.client) throw new Error("Claude provider not configured");
    const { system, rest } = splitSystem(req.messages);
    const model = CLAUDE_MODELS[req.task];

    const res = await this.client.messages.create({
      model,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature ?? (req.json ? 0.1 : 0.7),
      system: req.json ? `${system}\n\nRéponds UNIQUEMENT par du JSON valide, sans markdown.` : system,
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
      model,
      usage: {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
      },
    };
  }
}

// ============ MISTRAL ============

const MISTRAL_MODELS: Record<LLMTask, string> = {
  conversation: "mistral-small-latest",
  validation: "mistral-small-latest",
  spec_generation: "mistral-large-latest",
  complex_spec: "mistral-large-latest",
};

export class MistralProvider implements LLMProvider {
  readonly name = "mistral";
  readonly available: boolean;
  private client: Mistral | null;

  constructor(apiKey = process.env.MISTRAL_API_KEY) {
    this.available = Boolean(apiKey);
    this.client = apiKey ? new Mistral({ apiKey }) : null;
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    if (!this.client) throw new Error("Mistral provider not configured");
    const model = MISTRAL_MODELS[req.task];

    const res = await this.client.chat.complete({
      model,
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
      model,
      usage: {
        inputTokens: res.usage?.promptTokens,
        outputTokens: res.usage?.completionTokens,
      },
    };
  }
}

// ============ GEMINI ============

const GEMINI_MODELS: Record<LLMTask, string> = {
  conversation: "gemini-2.0-flash",
  validation: "gemini-2.0-flash",
  spec_generation: "gemini-2.5-pro",
  complex_spec: "gemini-2.5-pro",
};

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  readonly available: boolean;
  private client: GoogleGenerativeAI | null;

  constructor(apiKey = process.env.GEMINI_API_KEY) {
    this.available = Boolean(apiKey);
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    if (!this.client) throw new Error("Gemini provider not configured");
    const modelName = GEMINI_MODELS[req.task];
    const { system, rest } = splitSystem(req.messages);

    const model = this.client.getGenerativeModel({
      model: modelName,
      systemInstruction: req.json
        ? `${system}\n\nRéponds UNIQUEMENT par du JSON valide, sans markdown.`
        : system,
      generationConfig: {
        maxOutputTokens: req.maxTokens ?? 4096,
        temperature: req.temperature ?? (req.json ? 0.1 : 0.7),
        responseMimeType: req.json ? "application/json" : "text/plain",
      },
    });

    const res = await model.generateContent({
      contents: rest.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    });

    return {
      content: res.response.text(),
      provider: this.name,
      model: modelName,
      usage: {
        inputTokens: res.response.usageMetadata?.promptTokenCount,
        outputTokens: res.response.usageMetadata?.candidatesTokenCount,
      },
    };
  }
}

// ============ ROUTER ============

type ProviderName = "claude" | "mistral" | "gemini";

const ROUTING: Record<Plan, Record<LLMTask, ProviderName[]>> = {
  FREE: {
    conversation: ["mistral", "gemini", "claude"],
    validation: ["mistral", "gemini", "claude"],
    spec_generation: ["gemini", "mistral", "claude"],
    complex_spec: ["claude", "gemini", "mistral"],
  },
  STARTER: {
    conversation: ["mistral", "claude", "gemini"],
    validation: ["mistral", "claude", "gemini"],
    spec_generation: ["claude", "mistral", "gemini"],
    complex_spec: ["claude", "gemini", "mistral"],
  },
  PRO: {
    conversation: ["claude", "mistral", "gemini"],
    validation: ["claude", "mistral", "gemini"],
    spec_generation: ["claude", "gemini", "mistral"],
    complex_spec: ["claude", "gemini", "mistral"],
  },
  BUSINESS: {
    conversation: ["claude", "mistral", "gemini"],
    validation: ["claude", "mistral", "gemini"],
    spec_generation: ["claude", "gemini", "mistral"],
    complex_spec: ["claude", "gemini", "mistral"],
  },
};

let registry: Record<ProviderName, LLMProvider> | null = null;

function getRegistry(): Record<ProviderName, LLMProvider> {
  if (!registry) {
    registry = {
      claude: new ClaudeProvider(),
      mistral: new MistralProvider(),
      gemini: new GeminiProvider(),
    };
  }
  return registry;
}

export function listProviders(): Array<{ name: ProviderName; available: boolean }> {
  const r = getRegistry();
  return (["claude", "mistral", "gemini"] as ProviderName[]).map((name) => ({
    name,
    available: r[name].available,
  }));
}

export async function routeLLM(
  task: LLMTask,
  userPlan: Plan,
  req: Omit<LLMRequest, "task">,
): Promise<LLMResponse> {
  const r = getRegistry();
  const order = ROUTING[userPlan]?.[task] ?? ROUTING.FREE[task];

  const errors: Array<{ provider: ProviderName; error: string }> = [];

  for (const providerName of order) {
    const provider = r[providerName];
    if (!provider.available) continue;
    try {
      return await provider.generate({ task, ...req });
    } catch (err) {
      errors.push({
        provider: providerName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (r.claude.available && !order.includes("claude")) {
    try {
      return await r.claude.generate({ task, ...req });
    } catch (err) {
      errors.push({
        provider: "claude",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  throw new Error(
    `Aucun fournisseur LLM disponible pour task=${task} plan=${userPlan}. Erreurs : ` +
      errors.map((e) => `${e.provider}: ${e.error}`).join(" | "),
  );
}
