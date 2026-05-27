"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import { ArrowRight, Check, Copy, Rocket } from "lucide-react";

type SnippetEndpoint = {
  method: string;
  path: string;
  summary?: string;
};

type Props = {
  apiName: string;
  jobId: string;
  deploymentUrl: string | null;
  openApiSpec: Record<string, unknown>;
  endpoints: SnippetEndpoint[];
};

const HIDE_LOGO_CSS = `
  .scalar-app .scalar-api-reference,
  .scalar-app {
    background: #0E100E !important;
    color: #F5F6F2 !important;
  }
  .scalar-app .scalar-api-reference .references-rendered,
  .scalar-app .scalar-api-reference .references-classic {
    background: #0E100E !important;
  }
  .scalar-app a[href*="scalar.com"],
  .scalar-app .powered-by,
  .scalar-app [class*="scalar-powered"],
  .scalar-app [class*="Powered"],
  .scalar-app .scalar-api-reference .open-api-client-button,
  .scalar-app .scalar-api-reference .download-button-wrapper {
    display: none !important;
  }
`;

function buildExampleUrl(deploymentUrl: string | null, path: string): string {
  const base = deploymentUrl ?? "https://api-exemple.zeroapi.app";
  const cleanedPath = path.replace(/\{([^}]+)\}/g, ":$1");
  return `${base.replace(/\/$/, "")}${cleanedPath}`;
}

function buildSnippets(
  method: string,
  url: string,
): Record<"curl" | "fetch" | "axios", string> {
  const m = method.toUpperCase();
  const isBodyMethod = m === "POST" || m === "PUT" || m === "PATCH";
  const curl =
    `curl -X ${m} ${url} \\\n` +
    `  -H "Authorization: Bearer TOKEN"` +
    (isBodyMethod
      ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '{}'`
      : "");
  const fetchSnippet =
    `const res = await fetch(\n` +
    `  "${url}",\n` +
    `  {\n` +
    `    method: "${m}",\n` +
    `    headers: { Authorization: "Bearer TOKEN"${
      isBodyMethod ? `, "Content-Type": "application/json"` : ""
    } },${isBodyMethod ? `\n    body: JSON.stringify({}),` : ""}\n` +
    `  },\n` +
    `);\n` +
    `const data = await res.json();`;
  const axiosVerb = m.toLowerCase();
  const axios =
    isBodyMethod
      ? `const { data } = await axios.${axiosVerb}(\n  "${url}",\n  {}, // body\n  { headers: { Authorization: "Bearer TOKEN" } },\n);`
      : `const { data } = await axios.${axiosVerb}(\n  "${url}",\n  { headers: { Authorization: "Bearer TOKEN" } },\n);`;
  return { curl, fetch: fetchSnippet, axios };
}

const METHOD_COLOR: Record<string, string> = {
  GET: "bg-[#1554B5] text-white",
  POST: "bg-[#16a34a] text-white",
  PUT: "bg-[#d97706] text-white",
  PATCH: "bg-[#d97706] text-white",
  DELETE: "bg-[#dc2626] text-white",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10.5px] text-white/70 transition hover:border-white/20 hover:text-white"
      aria-label={copied ? "Copié" : "Copier"}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-[#10F083]" />
          copié
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          copier
        </>
      )}
    </button>
  );
}

function SnippetCard({
  endpoint,
  deploymentUrl,
}: {
  endpoint: SnippetEndpoint;
  deploymentUrl: string | null;
}) {
  const url = buildExampleUrl(deploymentUrl, endpoint.path);
  const snippets = useMemo(
    () => buildSnippets(endpoint.method, url),
    [endpoint.method, url],
  );
  const [lang, setLang] = useState<"curl" | "fetch" | "axios">("curl");

  return (
    <div className="overflow-hidden rounded-[12px] border border-white/10 bg-[#161816]">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-3.5 py-2.5">
        <span
          className={
            "inline-flex justify-center rounded-[5px] px-1.5 py-0.5 font-mono text-[10.5px] font-semibold tracking-[0.04em] " +
            (METHOD_COLOR[endpoint.method] ?? "bg-white/10 text-white")
          }
        >
          {endpoint.method}
        </span>
        <code className="flex-1 truncate font-mono text-[12.5px] text-white/90">
          {endpoint.path}
        </code>
        <div className="flex gap-1">
          {(["curl", "fetch", "axios"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={
                "rounded-[5px] px-2 py-0.5 font-mono text-[10.5px] transition " +
                (lang === l
                  ? "bg-[#10F083] text-[#002914]"
                  : "text-white/50 hover:text-white/90")
              }
            >
              {l}
            </button>
          ))}
        </div>
        <CopyButton text={snippets[lang]} />
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[12px] leading-[1.65] text-white/85">
        <code>{snippets[lang]}</code>
      </pre>
    </div>
  );
}

export function PlaygroundPanel({
  apiName,
  jobId,
  deploymentUrl,
  openApiSpec,
  endpoints,
}: Props) {
  const isLive = Boolean(deploymentUrl);

  const enrichedSpec = useMemo(() => {
    const cloned = JSON.parse(JSON.stringify(openApiSpec)) as Record<string, unknown>;
    if (deploymentUrl) {
      cloned.servers = [{ url: deploymentUrl, description: "Production · ZeroAPI Cloud" }];
    } else if (!cloned.servers) {
      cloned.servers = [
        { url: "https://api-exemple.zeroapi.app", description: "Aperçu (non déployé)" },
      ];
    }
    const info = (cloned.info as Record<string, unknown> | undefined) ?? {};
    cloned.info = { ...info, title: `${apiName} — Playground` };
    return cloned;
  }, [openApiSpec, deploymentUrl, apiName]);

  const snippetEndpoints = endpoints.slice(0, 4);

  return (
    <div className="overflow-hidden rounded-[14px] border border-white/5 bg-[#0E100E] text-white">
      {!isLive && (
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#10F083]/30 bg-[#10F083]/[0.06] px-4 py-3.5">
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-[#10F083] text-[#002914]">
              <Rocket className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-white">
                Déploie ton API sur ZeroAPI Cloud pour tester en live
              </div>
              <div className="mt-0.5 text-[12.5px] text-white/60">
                Le Playground reste utilisable en lecture seule, mais les requêtes
                échoueront tant qu&apos;aucune URL n&apos;est en ligne.
              </div>
            </div>
            <Link
              href={`/jobs/${jobId}/deploy`}
              className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-[#10F083] px-3.5 text-[13px] font-medium text-[#002914] transition hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(16,240,131,0.35)]"
            >
              Déployer maintenant
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      <div className="border-b border-white/10 px-5 py-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/50">
            Snippets de code
          </h3>
          <span className="font-mono text-[11px] text-white/40">
            {isLive ? deploymentUrl : "exemple non déployé"}
          </span>
        </div>
        {snippetEndpoints.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-white/10 px-4 py-6 text-center text-[12.5px] text-white/50">
            Aucun endpoint disponible dans la spec.
          </div>
        ) : (
          <div className="grid gap-2.5">
            {snippetEndpoints.map((e, i) => (
              <SnippetCard
                key={`${e.method}-${e.path}-${i}`}
                endpoint={e}
                deploymentUrl={deploymentUrl}
              />
            ))}
          </div>
        )}
      </div>

      <style>{HIDE_LOGO_CSS}</style>
      <div className="scalar-app min-h-[600px] bg-[#0E100E]">
        <ApiReferenceReact
          configuration={{
            content: enrichedSpec,
            theme: "moon",
            forceDarkModeState: "dark",
            hideDarkModeToggle: true,
            hideClientButton: false,
            hideTestRequestButton: false,
            hideModels: false,
            withDefaultFonts: false,
            servers: deploymentUrl
              ? [{ url: deploymentUrl }]
              : undefined,
          }}
        />
      </div>
    </div>
  );
}
