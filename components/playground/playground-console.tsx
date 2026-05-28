"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Loader2,
  Play,
  Plus,
  Rocket,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PlaygroundEndpoint = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary?: string;
  pathParams: string[];
  resource?: string;
};

export type PlaygroundApi = {
  id: string;
  name: string;
  description?: string;
  deploymentUrl: string | null;
  isOnline: boolean;
  endpoints: PlaygroundEndpoint[];
};

type ResponseState = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  elapsedMs: number;
  truncated: boolean;
  url: string;
} | null;

type ErrorState = { message: string; url?: string } | null;

const METHOD_TONE: Record<PlaygroundEndpoint["method"], string> = {
  GET: "bg-[#E5F0FF] text-[#1554B5]",
  POST: "bg-accent-soft text-accent-ink",
  PUT: "bg-warn-soft text-warn-ink",
  PATCH: "bg-warn-soft text-warn-ink",
  DELETE: "bg-danger-soft text-danger",
};

type KV = { id: string; key: string; value: string; enabled: boolean };

function emptyRow(): KV {
  return { id: Math.random().toString(36).slice(2, 9), key: "", value: "", enabled: true };
}

function defaultBodyFor(method: PlaygroundEndpoint["method"]): string {
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    return JSON.stringify({}, null, 2);
  }
  return "";
}

function statusTone(status: number): string {
  if (status >= 200 && status < 300) return "bg-accent text-accent-ink";
  if (status >= 300 && status < 400) return "bg-warn-soft text-warn-ink";
  if (status >= 400 && status < 500) return "bg-danger-soft text-danger";
  if (status >= 500) return "bg-danger text-white";
  return "bg-bg-2 text-muted";
}

function prettyJson(text: string): { ok: boolean; pretty: string } {
  try {
    const parsed = JSON.parse(text);
    return { ok: true, pretty: JSON.stringify(parsed, null, 2) };
  } catch {
    return { ok: false, pretty: text };
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ko`;
  return `${(n / (1024 * 1024)).toFixed(2)} Mo`;
}

function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-[6px] border border-line bg-surface px-2 py-1 font-mono text-[10.5px] text-muted transition hover:border-line-2 hover:text-ink"
      aria-label={label}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-accent-ink" />
          copié
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label}
        </>
      )}
    </button>
  );
}

function KvEditor({
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
}: {
  rows: KV[];
  onChange: (rows: KV[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  const update = (id: string, patch: Partial<KV>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));
  return (
    <div className="space-y-1.5">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-1.5 rounded-[8px] border border-line bg-surface pl-2"
        >
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => update(row.id, { enabled: e.target.checked })}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
            aria-label="Activer"
          />
          <input
            value={row.key}
            onChange={(e) => update(row.id, { key: e.target.value })}
            placeholder={keyPlaceholder}
            className="h-8 flex-1 bg-transparent font-mono text-[12.5px] text-ink outline-none placeholder:text-muted-2"
          />
          <span className="text-muted-2">:</span>
          <input
            value={row.value}
            onChange={(e) => update(row.id, { value: e.target.value })}
            placeholder={valuePlaceholder}
            className="h-8 flex-[1.5] bg-transparent font-mono text-[12.5px] text-ink outline-none placeholder:text-muted-2"
          />
          <button
            type="button"
            onClick={() => remove(row.id)}
            className="grid h-7 w-7 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-danger"
            aria-label="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, emptyRow()])}
        className="inline-flex items-center gap-1.5 rounded-[7px] border border-dashed border-line-2 px-2.5 py-1.5 font-mono text-[11px] text-muted transition hover:border-ink hover:text-ink"
      >
        <Plus className="h-3 w-3" /> Ajouter une ligne
      </button>
    </div>
  );
}

export function PlaygroundConsole({ apis }: { apis: PlaygroundApi[] }) {
  const [selectedApiId, setSelectedApiId] = useState<string | null>(
    apis.find((a) => a.isOnline)?.id ?? apis[0]?.id ?? null,
  );
  const selectedApi = useMemo(
    () => apis.find((a) => a.id === selectedApiId) ?? null,
    [apis, selectedApiId],
  );

  const [selectedEpKey, setSelectedEpKey] = useState<string | null>(null);
  const selectedEndpoint = useMemo(() => {
    if (!selectedApi || !selectedEpKey) return null;
    return (
      selectedApi.endpoints.find((e) => `${e.method} ${e.path}` === selectedEpKey) ?? null
    );
  }, [selectedApi, selectedEpKey]);

  useEffect(() => {
    if (!selectedApi) {
      setSelectedEpKey(null);
      return;
    }
    if (
      !selectedEpKey ||
      !selectedApi.endpoints.find((e) => `${e.method} ${e.path}` === selectedEpKey)
    ) {
      const first = selectedApi.endpoints[0];
      setSelectedEpKey(first ? `${first.method} ${first.path}` : null);
    }
  }, [selectedApi, selectedEpKey]);

  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryRows, setQueryRows] = useState<KV[]>([emptyRow()]);
  const [headerRows, setHeaderRows] = useState<KV[]>([
    { id: "auth", key: "Authorization", value: "Bearer ", enabled: true },
  ]);
  const [bodyText, setBodyText] = useState<string>("");
  const [requestTab, setRequestTab] = useState<"params" | "headers" | "body">("params");
  const [responseTab, setResponseTab] = useState<"body" | "headers">("body");
  const [response, setResponse] = useState<ResponseState>(null);
  const [error, setError] = useState<ErrorState>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!selectedEndpoint) return;
    const init: Record<string, string> = {};
    selectedEndpoint.pathParams.forEach((p) => {
      init[p] = "";
    });
    setPathValues(init);
    setBodyText(defaultBodyFor(selectedEndpoint.method));
    setResponse(null);
    setError(null);
    setRequestTab(
      selectedEndpoint.method === "GET" || selectedEndpoint.method === "DELETE"
        ? "params"
        : "body",
    );
  }, [selectedEndpoint?.method, selectedEndpoint?.path]);

  const builtPath = useMemo(() => {
    if (!selectedEndpoint) return "";
    let p = selectedEndpoint.path;
    for (const param of selectedEndpoint.pathParams) {
      const v = pathValues[param] || `{${param}}`;
      p = p.replace(`:${param}`, v).replace(`{${param}}`, v);
    }
    return p;
  }, [selectedEndpoint, pathValues]);

  const builtUrl = useMemo(() => {
    if (!selectedApi || !selectedEndpoint) return "";
    const base = selectedApi.deploymentUrl ?? "https://api-exemple.zeroapi.app";
    const cleanBase = base.replace(/\/$/, "");
    const search = new URLSearchParams();
    queryRows.forEach((r) => {
      if (r.enabled && r.key && r.value) search.set(r.key, r.value);
    });
    const qs = search.toString();
    return `${cleanBase}${builtPath}${qs ? `?${qs}` : ""}`;
  }, [selectedApi, selectedEndpoint, builtPath, queryRows]);

  const canSend = Boolean(selectedApi?.isOnline && selectedEndpoint && !sending);

  const send = useCallback(async () => {
    if (!selectedApi || !selectedEndpoint) return;
    setSending(true);
    setError(null);
    setResponse(null);

    const query: Record<string, string> = {};
    queryRows.forEach((r) => {
      if (r.enabled && r.key) query[r.key] = r.value;
    });
    const hdrs: Record<string, string> = {};
    headerRows.forEach((r) => {
      if (r.enabled && r.key && r.value) hdrs[r.key] = r.value;
    });

    try {
      const res = await fetch("/api/playground/proxy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId: selectedApi.id,
          method: selectedEndpoint.method,
          path: builtPath,
          query,
          headers: hdrs,
          body: selectedEndpoint.method === "GET" || selectedEndpoint.method === "DELETE"
            ? undefined
            : bodyText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data?.error ?? "Erreur inconnue", url: data?.url });
      } else {
        setResponse(data);
        setResponseTab("body");
      }
    } catch (err) {
      setError({ message: (err as Error).message });
    } finally {
      setSending(false);
    }
  }, [selectedApi, selectedEndpoint, queryRows, headerRows, builtPath, bodyText]);

  if (apis.length === 0) {
    return (
      <div className="grid place-items-center rounded-[14px] border border-dashed border-line-2 bg-surface px-6 py-16">
        <div className="max-w-md text-center">
          <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-accent-soft text-accent-ink mx-auto mb-4">
            <Play className="h-5 w-5" />
          </span>
          <h2 className="font-serif text-[26px] italic leading-tight">Rien à tester.</h2>
          <p className="mt-2 text-[14px] text-muted">
            Génère ta première API puis reviens ici pour la lancer en live.
          </p>
          <Link
            href="/generate"
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-accent px-3.5 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
          >
            Créer une API
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const responsePretty = response ? prettyJson(response.body) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-3 lg:sticky lg:top-3 lg:self-start">
        <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
          <div className="border-b border-line px-3 py-2.5">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
              APIs ({apis.length})
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
            {apis.map((api) => {
              const active = api.id === selectedApiId;
              return (
                <button
                  key={api.id}
                  type="button"
                  onClick={() => setSelectedApiId(api.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left transition border-b border-line last:border-b-0",
                    active ? "bg-ink text-bg" : "hover:bg-bg-2",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-2 w-2 flex-shrink-0 rounded-full",
                      api.isOnline ? "bg-accent" : "bg-line-2",
                    )}
                    style={
                      api.isOnline ? { boxShadow: "0 0 0 3px var(--accent-glow)" } : undefined
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{api.name}</div>
                    <div
                      className={cn(
                        "truncate font-mono text-[10.5px]",
                        active ? "text-bg/60" : "text-muted",
                      )}
                    >
                      {api.isOnline ? api.deploymentUrl : "non déployée"}
                    </div>
                  </div>
                  {active && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                </button>
              );
            })}
          </div>
        </div>

        {selectedApi && (
          <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
            <div className="border-b border-line px-3 py-2.5">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                Endpoints ({selectedApi.endpoints.length})
              </div>
            </div>
            <div className="max-h-[460px] overflow-y-auto scrollbar-thin">
              {selectedApi.endpoints.length === 0 ? (
                <div className="px-3 py-6 text-center text-[12.5px] text-muted">
                  Aucun endpoint dans la spec.
                </div>
              ) : (
                selectedApi.endpoints.map((ep) => {
                  const key = `${ep.method} ${ep.path}`;
                  const active = key === selectedEpKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedEpKey(key)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left transition border-b border-line last:border-b-0",
                        active ? "bg-accent-soft" : "hover:bg-bg-2",
                      )}
                    >
                      <span
                        className={
                          "inline-flex w-12 justify-center rounded-[5px] px-1 py-0.5 font-mono text-[10px] font-semibold " +
                          METHOD_TONE[ep.method]
                        }
                      >
                        {ep.method}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink">
                        {ep.path}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </aside>

      <main className="space-y-3">
        {selectedApi && !selectedApi.isOnline && (
          <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-warn/30 bg-warn-soft px-4 py-3">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] bg-warn text-warn-ink">
              <Rocket className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 text-[13px] text-warn-ink">
              <strong>Cette API n&apos;est pas en ligne.</strong> Déploie-la pour pouvoir lancer
              de vraies requêtes.
            </div>
            <Link
              href={`/jobs/${selectedApi.id}/deploy`}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-warn-ink px-3 text-[12.5px] font-medium text-warn-soft transition hover:-translate-y-px"
            >
              Déployer maintenant
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {selectedEndpoint && selectedApi ? (
          <>
            <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
                <span
                  className={
                    "inline-flex justify-center rounded-[6px] px-2 py-0.5 font-mono text-[11.5px] font-semibold " +
                    METHOD_TONE[selectedEndpoint.method]
                  }
                >
                  {selectedEndpoint.method}
                </span>
                <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">
                  {builtUrl}
                </code>
                <CopyButton text={builtUrl} label="copier URL" />
                <button
                  type="button"
                  onClick={send}
                  disabled={!canSend}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-[9px] px-4 text-[13px] font-medium transition",
                    canSend
                      ? "bg-accent text-accent-ink hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
                      : "bg-bg-2 text-muted cursor-not-allowed",
                  )}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Envoyer
                    </>
                  )}
                </button>
              </div>

              <div className="flex gap-1 border-b border-line px-3">
                {(
                  [
                    { id: "params", label: "Paramètres" },
                    { id: "headers", label: "Headers" },
                    { id: "body", label: "Body", show: selectedEndpoint.method !== "GET" && selectedEndpoint.method !== "DELETE" },
                  ] as Array<{ id: typeof requestTab; label: string; show?: boolean }>
                )
                  .filter((t) => t.show !== false)
                  .map((t) => {
                    const isOn = requestTab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setRequestTab(t.id)}
                        className={cn(
                          "relative px-3 py-2.5 text-[12.5px] transition",
                          isOn ? "font-medium text-ink" : "text-muted hover:text-ink",
                        )}
                      >
                        {t.label}
                        {isOn && (
                          <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-ink" />
                        )}
                      </button>
                    );
                  })}
              </div>

              <div className="p-3.5">
                {requestTab === "params" && (
                  <div className="space-y-4">
                    {selectedEndpoint.pathParams.length > 0 && (
                      <div>
                        <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                          Path
                        </div>
                        <div className="space-y-1.5">
                          {selectedEndpoint.pathParams.map((p) => (
                            <div
                              key={p}
                              className="flex items-center gap-2 rounded-[8px] border border-line bg-bg-2 px-2.5"
                            >
                              <span className="min-w-[80px] font-mono text-[12px] text-accent-ink">
                                {p}
                              </span>
                              <span className="text-muted-2">=</span>
                              <input
                                value={pathValues[p] ?? ""}
                                onChange={(e) =>
                                  setPathValues((v) => ({ ...v, [p]: e.target.value }))
                                }
                                placeholder={`valeur de ${p}`}
                                className="h-8 flex-1 bg-transparent font-mono text-[12.5px] text-ink outline-none placeholder:text-muted-2"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                        Query
                      </div>
                      <KvEditor
                        rows={queryRows}
                        onChange={setQueryRows}
                        keyPlaceholder="clé"
                        valuePlaceholder="valeur"
                      />
                    </div>
                  </div>
                )}
                {requestTab === "headers" && (
                  <KvEditor
                    rows={headerRows}
                    onChange={setHeaderRows}
                    keyPlaceholder="nom du header"
                    valuePlaceholder="valeur"
                  />
                )}
                {requestTab === "body" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                        JSON
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const r = prettyJson(bodyText);
                          if (r.ok) setBodyText(r.pretty);
                        }}
                        className="font-mono text-[10.5px] text-muted transition hover:text-ink"
                      >
                        Formater
                      </button>
                    </div>
                    <textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      rows={10}
                      className="min-h-[180px] w-full rounded-[8px] border border-line bg-bg-2 px-3 py-2.5 font-mono text-[12.5px] text-ink outline-none transition focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-glow)]"
                      placeholder='{ "key": "value" }'
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                  Réponse
                </div>
                {response && (
                  <>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold",
                        statusTone(response.status),
                      )}
                    >
                      {response.status} {response.statusText}
                    </span>
                    <span className="font-mono text-[10.5px] text-muted">
                      {response.elapsedMs} ms
                    </span>
                    <span className="font-mono text-[10.5px] text-muted">
                      {formatBytes(response.size)}
                      {response.truncated && " (tronqué)"}
                    </span>
                    <div className="ml-auto">
                      <CopyButton text={responsePretty?.pretty ?? response.body} label="copier" />
                    </div>
                  </>
                )}
                {error && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2 py-0.5 font-mono text-[10.5px] text-danger">
                    <X className="h-3 w-3" /> Échec
                  </span>
                )}
                {!response && !error && !sending && (
                  <span className="font-mono text-[11px] text-muted">
                    En attente d&apos;un envoi
                  </span>
                )}
                {sending && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
                    <Loader2 className="h-3 w-3 animate-spin" /> Envoi en cours…
                  </span>
                )}
              </div>

              {response && (
                <div className="flex gap-1 border-b border-line px-3">
                  {(["body", "headers"] as const).map((t) => {
                    const isOn = responseTab === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setResponseTab(t)}
                        className={cn(
                          "relative px-3 py-2.5 text-[12.5px] transition",
                          isOn ? "font-medium text-ink" : "text-muted hover:text-ink",
                        )}
                      >
                        {t === "body" ? "Body" : `Headers (${Object.keys(response.headers).length})`}
                        {isOn && (
                          <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-ink" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="p-3.5">
                {error && (
                  <div className="rounded-[10px] border border-danger/30 bg-danger-soft p-3.5 text-[13px] text-danger">
                    <div className="font-semibold">{error.message}</div>
                    {error.url && (
                      <div className="mt-1 font-mono text-[11px] opacity-80 break-all">
                        {error.url}
                      </div>
                    )}
                  </div>
                )}
                {response && responseTab === "body" && (
                  <pre className="max-h-[460px] overflow-auto rounded-[10px] bg-bg-2 p-3 font-mono text-[12.5px] leading-[1.7] text-ink scrollbar-thin">
                    <code>
                      {responsePretty?.pretty ?? response.body ?? "(corps vide)"}
                    </code>
                  </pre>
                )}
                {response && responseTab === "headers" && (
                  <div className="overflow-hidden rounded-[10px] border border-line">
                    {Object.entries(response.headers).map(([k, v], i) => (
                      <div
                        key={k}
                        className={cn(
                          "grid grid-cols-[200px_1fr] gap-3 px-3 py-2 font-mono text-[12px]",
                          i > 0 && "border-t border-line",
                        )}
                      >
                        <span className="truncate text-muted">{k}</span>
                        <span className="break-all text-ink">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!response && !error && !sending && (
                  <div className="grid place-items-center px-3 py-10 text-center text-[13px] text-muted">
                    Sélectionne un endpoint, configure les paramètres puis clique sur{" "}
                    <strong className="ml-1 text-ink">Envoyer</strong>.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="grid place-items-center rounded-[14px] border border-dashed border-line-2 bg-surface px-6 py-16 text-center">
            <div>
              <h3 className="font-serif text-[22px] italic text-ink">Aucun endpoint</h3>
              <p className="mt-1 text-[13px] text-muted">
                Cette API n&apos;expose pas encore d&apos;endpoint testable.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
