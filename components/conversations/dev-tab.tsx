"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Code2, Copy, Download, FileJson, Loader2, RefreshCw, Terminal } from "lucide-react";
import { toast } from "sonner";
import type { FieldDefinition, ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { deriveEndpoints } from "@/components/api-detail/endpoints-list";

type Sub = "openapi" | "sdk" | "curl" | "exports";

const SUBS: Array<{ key: Sub; label: string; icon: React.ReactNode }> = [
  { key: "openapi", label: "OpenAPI", icon: <FileJson className="h-3 w-3" /> },
  { key: "sdk", label: "SDK", icon: <Code2 className="h-3 w-3" /> },
  { key: "curl", label: "cURL", icon: <Terminal className="h-3 w-3" /> },
  { key: "exports", label: "Exports", icon: <Download className="h-3 w-3" /> },
];

const EXPORTS: Array<{ artifact: string; label: string }> = [
  { artifact: "openapi", label: "OpenAPI (openapi.json)" },
  { artifact: "sdk", label: "SDK TypeScript (client.ts)" },
  { artifact: "postman", label: "Postman (collection.json)" },
  { artifact: "prisma", label: "Prisma (schema.prisma)" },
  { artifact: "readme", label: "README.md" },
  { artifact: "mermaid", label: "Schéma ER (schema.mmd)" },
];

export function DevTab({ conversationId, spec }: { conversationId: string; spec: ZeroAPISpec | null }) {
  const [sub, setSub] = useState<Sub>("openapi");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {SUBS.map((s) => {
          const active = sub === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSub(s.key)}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition " +
                (active ? "bg-ink text-bg" : "text-muted hover:bg-bg-3 hover:text-ink-2")
              }
            >
              {s.icon}
              {s.label}
            </button>
          );
        })}
      </div>

      {sub === "openapi" && <ArtifactView conversationId={conversationId} artifact="openapi" downloadName="openapi.json" />}
      {sub === "sdk" && <ArtifactView conversationId={conversationId} artifact="sdk" downloadName="client.ts" />}
      {sub === "curl" && <CurlView spec={spec} />}
      {sub === "exports" && <ExportsView conversationId={conversationId} />}
    </div>
  );
}

// ── OpenAPI / SDK viewer (fetched from the server route) ─────────────────────

function ArtifactView({
  conversationId,
  artifact,
  downloadName,
}: {
  conversationId: string;
  artifact: string;
  downloadName: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/dev?artifact=${artifact}`);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Génération impossible.");
      }
      setText(await res.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, artifact]);

  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copie impossible.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex h-7 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 text-[11.5px] font-medium text-ink-2 transition hover:border-line-2 disabled:opacity-50"
        >
          <RefreshCw className={"h-3 w-3 " + (loading ? "animate-spin" : "")} />
          Rafraîchir
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!text}
          className="inline-flex h-7 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 text-[11.5px] font-medium text-ink-2 transition hover:border-line-2 disabled:opacity-50"
        >
          {copied ? <Check className="h-3 w-3 text-accent-ink" /> : <Copy className="h-3 w-3" />}
          Copier
        </button>
        <a
          href={`/api/conversations/${conversationId}/dev?artifact=${artifact}&download=1`}
          className="inline-flex h-7 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 text-[11.5px] font-medium text-ink-2 transition hover:border-line-2"
        >
          <Download className="h-3 w-3" />
          {downloadName}
        </a>
      </div>

      {error ? (
        <div className="rounded-[10px] border border-dashed border-line-2 bg-surface p-4 text-center text-[12px] text-muted">
          {error}
        </div>
      ) : loading && !text ? (
        <div className="flex items-center gap-2 p-4 text-[12px] text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Génération…
        </div>
      ) : (
        <pre className="max-h-[60vh] overflow-auto rounded-[10px] border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed text-ink-2 scrollbar-thin">
          {text}
        </pre>
      )}
    </div>
  );
}

// ── cURL examples (client-side, live) ────────────────────────────────────────

function sampleValue(def: FieldDefinition): unknown {
  switch (def.type) {
    case "integer":
    case "number":
    case "decimal":
      return 0;
    case "boolean":
      return false;
    case "date":
      return "2024-01-01";
    case "datetime":
      return "2024-01-01T00:00:00Z";
    case "email":
      return "user@example.com";
    case "url":
      return "https://example.com";
    case "uuid":
      return "00000000-0000-0000-0000-000000000000";
    case "json":
      return {};
    case "enum":
      return def.values?.[0] ?? "value";
    default:
      return "string";
  }
}

function sampleBody(fields: Record<string, FieldDefinition> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, def] of Object.entries(fields ?? {})) {
    if (def.type === "file" || def.type === "file[]") continue;
    out[name] = sampleValue(def);
  }
  return out;
}

function CurlView({ spec }: { spec: ZeroAPISpec | null }) {
  const [baseUrl, setBaseUrl] = useState("https://api.exemple.com");

  const examples = useMemo(() => {
    if (!spec) return [];
    const list: Array<{ method: string; url: string; curl: string }> = [];
    for (const r of spec.resources) {
      for (const ep of deriveEndpoints([r])) {
        const path = ep.path.replace(/:id/g, "{id}");
        const url = baseUrl.replace(/\/$/, "") + path;
        const withBody = ep.method === "POST" || ep.method === "PUT" || ep.method === "PATCH";
        const parts = [`curl -X ${ep.method} ${url}`];
        if (ep.auth) parts.push(`-H "Authorization: Bearer $TOKEN"`);
        if (withBody) {
          parts.push(`-H "Content-Type: application/json"`);
          parts.push(`-d '${JSON.stringify(sampleBody(r.fields))}'`);
        }
        list.push({ method: ep.method, url, curl: parts.join(" \\\n  ") });
      }
    }
    return list;
  }, [spec, baseUrl]);

  return (
    <div className="space-y-2.5">
      <div>
        <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Base URL</div>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="h-8 w-full rounded-[8px] border border-line bg-bg px-2.5 font-mono text-[11px] text-ink outline-none transition focus:border-ink"
        />
      </div>
      {examples.map((e, i) => (
        <CurlRow key={i} method={e.method} url={e.url} curl={e.curl} />
      ))}
    </div>
  );
}

function CurlRow({ method, url, curl }: { method: string; url: string; curl: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(curl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copie impossible.");
    }
  }
  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="rounded-[4px] bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-2">
            {method}
          </span>
          <span className="truncate font-mono text-[11px] text-muted">{url}</span>
        </span>
        <button
          type="button"
          onClick={copy}
          title="Copier"
          className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
        >
          {copied ? <Check className="h-3 w-3 text-accent-ink" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <pre className="overflow-x-auto p-2.5 font-mono text-[10.5px] leading-relaxed text-ink-2 scrollbar-thin">
        {curl}
      </pre>
    </div>
  );
}

// ── Exports ──────────────────────────────────────────────────────────────────

function ExportsView({ conversationId }: { conversationId: string }) {
  return (
    <div className="space-y-1.5">
      {EXPORTS.map((e) => (
        <a
          key={e.artifact}
          href={`/api/conversations/${conversationId}/dev?artifact=${e.artifact}&download=1`}
          className="flex items-center gap-2 rounded-[10px] border border-line bg-surface px-3 py-2 text-[12.5px] text-ink-2 transition hover:border-line-2 hover:bg-bg-2"
        >
          <Download className="h-3.5 w-3.5 text-muted" />
          {e.label}
        </a>
      ))}
      <a
        href={`/api/conversations/${conversationId}/dev?artifact=zip&download=1`}
        className="mt-1 flex items-center gap-2 rounded-[10px] bg-accent px-3 py-2.5 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
      >
        <Download className="h-4 w-4" />
        Projet complet (.zip)
      </a>
    </div>
  );
}
