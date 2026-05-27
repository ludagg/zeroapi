"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Strip fenced code blocks that look like JSON (defense against the spec
// leaking into chat). Other fenced blocks render as code via react-markdown.
function stripJsonFences(s: string): string {
  return s.replace(/```(?:json)?\s*\n?([\s\S]*?)```/g, (match, body: string) => {
    const trimmed = body.trim();
    if (looksLikeJson(trimmed)) return "";
    return match;
  });
}

function stripJsonParagraphs(s: string): string {
  return s
    .split("\n\n")
    .filter((p) => !looksLikeJson(p.trim()))
    .join("\n\n");
}

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

function sanitize(raw: string): string {
  return stripJsonParagraphs(stripJsonFences(raw)).trim();
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

function MarkdownInner({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS} skipHtml>
      {sanitize(content)}
    </ReactMarkdown>
  );
}

export const Markdown = memo(MarkdownInner);
