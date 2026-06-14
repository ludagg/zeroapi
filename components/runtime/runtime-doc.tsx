"use client";

import { isValidElement, memo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Flatten a React node tree into its plain-text content (for heading slugs). */
function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children);
  return "";
}

/** GitHub-style slug: lowercase, non-alphanumerics → hyphens, collapsed/trimmed. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Pull the `## ` headings out of the raw markdown to build the table of contents. */
function tableOfContents(markdown: string): { slug: string; label: string }[] {
  const out: { slug: string; label: string }[] = [];
  for (const line of markdown.split("\n")) {
    const m = /^##\s+(?!#)(.+?)\s*$/.exec(line);
    if (!m) continue;
    const label = m[1].replace(/`/g, "");
    out.push({ slug: slugify(label), label });
  }
  return out;
}

const COMPONENTS: Components = {
  h2({ children }) {
    return <h2 id={slugify(nodeText(children))}>{children}</h2>;
  },
  h3({ children }) {
    return <h3 id={slugify(nodeText(children))}>{children}</h3>;
  },
  pre({ children }) {
    return (
      <pre className="my-4 overflow-x-auto rounded-[12px] border border-line bg-[var(--ink)] p-4 font-mono text-[13px] leading-relaxed text-[rgba(245,246,242,0.92)] scrollbar-thin">
        {children}
      </pre>
    );
  },
  code({ className, children }) {
    const isBlock = String(className ?? "").startsWith("language-");
    if (isBlock) {
      return <code className="font-mono text-[13px]">{children}</code>;
    }
    return (
      <code className="rounded bg-bg-2 px-1.5 py-px font-mono text-[13px] text-ink">
        {children}
      </code>
    );
  },
  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto rounded-[10px] border border-line scrollbar-thin">
        <table className="w-full border-collapse text-[14px]">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-bg-2">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="border-b border-line px-3 py-2 text-left align-top font-semibold text-ink">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border-b border-line px-3 py-2 align-top text-ink-2 [&>code]:whitespace-nowrap">
        {children}
      </td>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-4 rounded-r-[8px] border-l-2 border-accent bg-accent-soft px-4 py-2 text-ink-2">
        {children}
      </blockquote>
    );
  },
};

function RuntimeDocInner({ markdown, tocLabel }: { markdown: string; tocLabel: string }) {
  const toc = tableOfContents(markdown);

  return (
    <div className="docs-article">
      <aside className="docs-sidebar">
        <h4>{tocLabel}</h4>
        <ul>
          {toc.map((item, i) => (
            <li key={item.slug}>
              <a href={`#${item.slug}`} className={i === 0 ? "active" : ""}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      <div className="docs-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS} skipHtml>
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export const RuntimeDoc = memo(RuntimeDocInner);
