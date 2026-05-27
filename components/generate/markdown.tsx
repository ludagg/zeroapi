"use client";

import { type ReactNode, useState } from "react";
import { Check, Copy } from "lucide-react";

type Block =
  | { type: "code"; lang: string; value: string }
  | { type: "heading"; depth: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "hr" }
  | { type: "table"; header: string[]; rows: string[][] };

export function Markdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const blocks = parseBlocks(source ?? "");
  return (
    <div className={className ?? "space-y-3"}>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const sizes = [
        "text-[20px]",
        "text-[18px]",
        "text-[16.5px]",
        "text-[15.5px]",
        "text-[14.5px]",
        "text-[13.5px]",
      ];
      const Tag = `h${block.depth}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return (
        <Tag
          className={`mt-1 font-semibold leading-tight text-ink first:mt-0 ${sizes[block.depth - 1]}`}
        >
          {renderInline(block.text)}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="text-[15px] leading-relaxed text-ink-2">
          {renderInline(block.text)}
        </p>
      );
    case "blockquote":
      return (
        <blockquote className="border-l-2 border-line-2 pl-3.5 italic text-muted">
          {block.text.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="my-1.5 text-[14.5px] leading-relaxed">
              {renderInline(para)}
            </p>
          ))}
        </blockquote>
      );
    case "code":
      return <CodeBlock lang={block.lang} value={block.value} />;
    case "hr":
      return <hr className="my-1 border-t border-line" />;
    case "list":
      return block.ordered ? (
        <ol className="list-decimal space-y-1 pl-5 text-[15px] leading-relaxed text-ink-2 marker:font-mono marker:text-muted">
          {block.items.map((it, i) => (
            <li key={i} className="pl-1">
              {renderInline(it)}
            </li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-ink-2 marker:text-muted-2">
          {block.items.map((it, i) => (
            <li key={i} className="pl-1">
              {renderInline(it)}
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-[10px] border border-line scrollbar-thin">
          <table className="w-full border-collapse text-[14px] text-ink-2">
            <thead className="bg-bg-2">
              <tr>
                {block.header.map((h, i) => (
                  <th
                    key={i}
                    className="border-b border-line px-3 py-2 text-left font-medium text-ink"
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-line last:border-b-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-1.5 align-top">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function CodeBlock({ lang, value }: { lang: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-bg-2">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator === "undefined" || !navigator.clipboard) return;
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted transition hover:bg-bg-3 hover:text-ink"
          aria-label="Copier le code"
        >
          {copied ? (
            <>
              <Check className="h-2.5 w-2.5" /> copié
            </>
          ) : (
            <>
              <Copy className="h-2.5 w-2.5" /> copier
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-ink-2 scrollbar-thin">
        <code>{value}</code>
      </pre>
    </div>
  );
}

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const fence = /^```\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] ?? "";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: "code", lang, value: buf.join("\n") });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        depth: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text: heading[2],
      });
      i++;
      continue;
    }

    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: buf.join("\n") });
      continue;
    }

    if (
      /^\s*\|.*\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])
    ) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    const ul = /^\s*([-*+])\s+(.*)$/.exec(line);
    const ol = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      const ordered = !!ol;
      const items: string[] = [];
      while (i < lines.length) {
        const u = /^\s*([-*+])\s+(.*)$/.exec(lines[i]);
        const o = /^\s*(\d+)[.)]\s+(.*)$/.exec(lines[i]);
        if (ordered ? !o : !u) break;
        const text = ordered ? o![2] : u![2];
        items.push(text);
        i++;
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i]) &&
          !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])
        ) {
          items[items.length - 1] += "\n" + lines[i].trim();
          i++;
        }
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
      !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: buf.join("\n") });
  }

  return blocks;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buf = "";
  let i = 0;
  let key = 0;
  const flushText = () => {
    if (!buf) return;
    const parts = buf.split("\n");
    parts.forEach((p, idx) => {
      if (idx > 0) nodes.push(<br key={`br-${key++}`} />);
      if (p) nodes.push(<span key={`t-${key++}`}>{p}</span>);
    });
    buf = "";
  };

  while (i < text.length) {
    const c = text[i];
    const c2 = text.slice(i, i + 2);

    if (c === "\\" && i + 1 < text.length) {
      buf += text[i + 1];
      i += 2;
      continue;
    }

    if (c === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i) {
        flushText();
        nodes.push(
          <code
            key={`c-${key++}`}
            className="rounded bg-bg-2 px-1.5 py-px font-mono text-[0.88em] text-ink"
          >
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }

    if (c2 === "**" || c2 === "__") {
      const close = text.indexOf(c2, i + 2);
      if (close > i + 2) {
        flushText();
        nodes.push(
          <strong key={`b-${key++}`} className="font-semibold text-ink">
            {renderInline(text.slice(i + 2, close))}
          </strong>,
        );
        i = close + 2;
        continue;
      }
    }

    if (c2 === "~~") {
      const close = text.indexOf("~~", i + 2);
      if (close > i + 2) {
        flushText();
        nodes.push(
          <s key={`s-${key++}`} className="opacity-70">
            {renderInline(text.slice(i + 2, close))}
          </s>,
        );
        i = close + 2;
        continue;
      }
    }

    if ((c === "*" || c === "_") && text[i + 1] !== c) {
      const prev = i > 0 ? text[i - 1] : " ";
      const isWordChar = c === "_" && /\w/.test(prev);
      if (!isWordChar) {
        const close = findInlineClose(text, c, i + 1);
        if (close > i + 1) {
          flushText();
          nodes.push(
            <em key={`em-${key++}`} className="italic">
              {renderInline(text.slice(i + 1, close))}
            </em>,
          );
          i = close + 1;
          continue;
        }
      }
    }

    if (c === "[") {
      const link = /^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(text.slice(i));
      if (link) {
        const url = safeUrl(link[2]);
        if (url) {
          flushText();
          nodes.push(
            <a
              key={`a-${key++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline decoration-accent decoration-2 underline-offset-2 transition hover:text-accent-ink"
            >
              {renderInline(link[1])}
            </a>,
          );
          i += link[0].length;
          continue;
        }
      }
    }

    if (c === "h" || c === "H") {
      const auto = /^https?:\/\/[^\s<>()]+[^\s<>().,;:!?]/.exec(text.slice(i));
      if (auto) {
        flushText();
        nodes.push(
          <a
            key={`au-${key++}`}
            href={auto[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-ink underline decoration-accent decoration-2 underline-offset-2 transition hover:text-accent-ink"
          >
            {auto[0]}
          </a>,
        );
        i += auto[0].length;
        continue;
      }
    }

    buf += c;
    i++;
  }

  flushText();
  return nodes;
}

function findInlineClose(text: string, ch: string, from: number): number {
  let i = from;
  while (i < text.length) {
    if (text[i] === "\\") {
      i += 2;
      continue;
    }
    if (text[i] === ch && text[i + 1] !== ch) return i;
    i++;
  }
  return -1;
}

function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
  return null;
}
