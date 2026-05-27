"use client";

import { memo, Fragment } from "react";
import { Check, FileJson } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type Segment = { kind: "text"; value: string } | { kind: "spec"; value: SpecSummary };

type SpecSummary = {
  name?: string;
  resourceCount: number;
  endpointCount: number;
  authStrategy?: string;
  hasRoles: boolean;
  hasRateLimit: boolean;
};

function looksLikeJson(s: string): boolean {
  if (!s) return false;
  const isObject = s.startsWith("{") && s.endsWith("}");
  const isArray = s.startsWith("[") && s.endsWith("]");
  if (!isObject && !isArray) return false;
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

function summarizeIfSpec(raw: string): SpecSummary | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    const resources = (parsed as { resources?: unknown }).resources;
    if (!Array.isArray(resources) || resources.length === 0) return null;
    let endpointCount = 0;
    for (const r of resources) {
      if (!r || typeof r !== "object") continue;
      const eps = (r as { endpoints?: unknown }).endpoints;
      if (Array.isArray(eps)) endpointCount += eps.length;
      else endpointCount += 5;
      const custom = (r as { customEndpoints?: unknown }).customEndpoints;
      if (Array.isArray(custom)) endpointCount += custom.length;
    }
    const auth = (parsed as { auth?: { strategy?: string } }).auth;
    const roles = (parsed as { roles?: unknown[] }).roles;
    const rateLimit = (parsed as { rateLimit?: unknown }).rateLimit;
    return {
      name: typeof (parsed as { name?: unknown }).name === "string"
        ? ((parsed as { name?: string }).name as string)
        : undefined,
      resourceCount: resources.length,
      endpointCount,
      authStrategy: auth?.strategy,
      hasRoles: Array.isArray(roles) && roles.length > 0,
      hasRateLimit: Boolean(rateLimit),
    };
  } catch {
    return null;
  }
}

// Splits the assistant content into a mix of text segments and spec-card
// segments. Any fenced JSON block or standalone JSON paragraph is removed
// from the textual stream and replaced (or summarized) as a card.
function segment(raw: string): Segment[] {
  const out: Segment[] = [];
  const fenceRe = /```(?:json|JSON)?\s*\n?([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(raw)) !== null) {
    const before = raw.slice(cursor, match.index);
    if (before.trim().length > 0) out.push({ kind: "text", value: before });
    const body = match[1].trim();
    if (looksLikeJson(body)) {
      const summary = summarizeIfSpec(body);
      if (summary) out.push({ kind: "spec", value: summary });
      // else: drop the fenced JSON entirely
    } else {
      out.push({ kind: "text", value: match[0] });
    }
    cursor = match.index + match[0].length;
  }
  const rest = raw.slice(cursor);
  // For the rest, split on double newlines so we can detect standalone JSON
  // paragraphs as well.
  const paragraphs = rest.split(/\n\n+/);
  const textBuffer: string[] = [];
  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (looksLikeJson(trimmed)) {
      if (textBuffer.length) {
        out.push({ kind: "text", value: textBuffer.join("\n\n") });
        textBuffer.length = 0;
      }
      const summary = summarizeIfSpec(trimmed);
      if (summary) out.push({ kind: "spec", value: summary });
    } else if (trimmed.length > 0) {
      textBuffer.push(p);
    }
  }
  if (textBuffer.length) out.push({ kind: "text", value: textBuffer.join("\n\n") });
  return out;
}

const MARKDOWN_COMPONENTS: Components = {
  p({ children }) {
    return <p className="leading-relaxed">{children}</p>;
  },
  strong({ children }) {
    return <strong className="font-semibold text-ink">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  del({ children }) {
    return <del className="text-muted line-through">{children}</del>;
  },
  a({ children, href }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="border-b border-accent font-medium text-ink hover:bg-accent-soft"
      >
        {children}
      </a>
    );
  },
  h1({ children }) {
    return <h1 className="mt-1 font-serif text-[22px] leading-tight text-ink">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="mt-1 font-serif text-[19px] leading-tight text-ink">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="mt-1 text-[16px] font-semibold text-ink">{children}</h3>;
  },
  h4({ children }) {
    return <h4 className="mt-1 text-[14.5px] font-semibold text-ink">{children}</h4>;
  },
  h5({ children }) {
    return <h5 className="text-[14px] font-semibold text-ink">{children}</h5>;
  },
  h6({ children }) {
    return <h6 className="text-[13.5px] font-semibold text-ink">{children}</h6>;
  },
  ul({ children }) {
    return (
      <ul className="my-1 list-disc space-y-1 pl-5 marker:text-muted-2">{children}</ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="my-1 list-decimal space-y-1 pl-5 marker:text-muted">{children}</ol>
    );
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-1 border-l-2 border-line-2 pl-3 text-muted">
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="my-3 border-t border-line" />;
  },
  code({ className, children, ...props }) {
    const lang = String(className ?? "");
    const isBlock = lang.startsWith("language-");
    if (!isBlock) {
      return (
        <code
          className="rounded bg-bg-2 px-1.5 py-px font-mono text-[13px] text-ink"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="block whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-ink"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre({ children }) {
    return (
      <pre className="my-1 overflow-x-auto rounded-[10px] border border-line bg-bg-2 p-3 scrollbar-thin">
        {children}
      </pre>
    );
  },
  table({ children }) {
    return (
      <div className="my-1 overflow-x-auto rounded-[8px] border border-line scrollbar-thin">
        <table className="w-full border-collapse text-[13px]">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-bg-2">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="border-b border-line px-3 py-2 text-left font-medium text-ink">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border-b border-line px-3 py-2 text-ink-2 last:border-b-0">{children}</td>
    );
  },
};

function SpecCard({ summary }: { summary: SpecSummary }) {
  const parts: string[] = [
    `${summary.resourceCount} ressource${summary.resourceCount > 1 ? "s" : ""}`,
  ];
  if (summary.authStrategy) parts.push(summary.authStrategy.toUpperCase());
  parts.push(`${summary.endpointCount} endpoint${summary.endpointCount > 1 ? "s" : ""}`);
  if (summary.hasRateLimit) parts.push("rate-limit");
  if (summary.hasRoles) parts.push("RBAC");

  return (
    <div className="my-2 rounded-[12px] border border-accent/40 bg-accent-soft px-4 py-3">
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-accent-ink">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
        Spec générée
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11.5px] text-accent-ink/85">
        <FileJson className="h-3 w-3" />
        {summary.name ?? "spec"}
      </div>
      <div className="mt-2 text-[12.5px] leading-snug text-ink-2">
        {parts.join(" · ")}
      </div>
      <div className="mt-2.5 text-[11.5px] text-muted">
        Lance la génération pour voir le code, les tests et les endpoints détaillés.
      </div>
    </div>
  );
}

function MarkdownInner({ content }: { content: string }) {
  const segments = segment(content);
  if (segments.length === 0) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS} skipHtml>
        {""}
      </ReactMarkdown>
    );
  }
  return (
    <>
      {segments.map((seg, i) => (
        <Fragment key={i}>
          {seg.kind === "text" ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MARKDOWN_COMPONENTS}
              skipHtml
            >
              {seg.value}
            </ReactMarkdown>
          ) : (
            <SpecCard summary={seg.value} />
          )}
        </Fragment>
      ))}
    </>
  );
}

export const Markdown = memo(MarkdownInner);
