"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

export type CodeFile = {
  name: string;
  content: string;
  language: "prisma" | "ts" | "json" | "text";
};

export function CodeViewer({ files }: { files: CodeFile[] }) {
  const [active, setActive] = useState(0);
  const file = files[active];
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // noop
    }
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-[#0E100E]">
      <div className="flex gap-0 overflow-x-auto border-b border-white/[0.08] bg-[#0E100E] px-3 scrollbar-thin">
        {files.map((f, i) => (
          <button
            key={f.name}
            type="button"
            onClick={() => setActive(i)}
            className={
              "whitespace-nowrap border-b-2 px-3 py-2.5 font-mono text-[11.5px] transition " +
              (i === active
                ? "border-accent text-[#E5E7E3]"
                : "border-transparent text-[#6A6E66] hover:text-[#E5E7E3]")
            }
          >
            {f.name}
          </button>
        ))}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={copy}
          className="absolute right-3.5 top-3 z-10 inline-flex items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-[#6A6E66] transition hover:bg-white/10 hover:text-[#E5E7E3]"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copié" : "Copier"}
        </button>
        <Highlighted code={file.content} language={file.language} />
      </div>
    </div>
  );
}

function Highlighted({
  code,
  language,
}: {
  code: string;
  language: CodeFile["language"];
}) {
  const lines = useMemo(() => code.split("\n"), [code]);
  return (
    <pre className="overflow-x-auto px-5 py-4 font-mono text-[12.5px] leading-[1.7] text-[#E5E7E3] scrollbar-thin">
      <code>
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre">
            <span className="mr-3 inline-block w-7 select-none text-right text-[#6A6E66]">
              {i + 1}
            </span>
            {renderLine(line, language)}
          </div>
        ))}
      </code>
    </pre>
  );
}

function renderLine(line: string, language: CodeFile["language"]): React.ReactNode {
  if (language === "text") return line;
  const tokens = tokenize(line, language);
  return tokens.map((t, i) => {
    if (t.kind === "txt") return <span key={i}>{t.value}</span>;
    return (
      <span key={i} className={CLASS[t.kind]}>
        {t.value}
      </span>
    );
  });
}

type Kind = "txt" | "kw" | "str" | "num" | "fn" | "c" | "type" | "attr";

const CLASS: Record<Kind, string> = {
  txt: "",
  kw: "text-[#FF8AA6]",
  str: "text-[#10F083]",
  num: "text-[#FFCC66]",
  fn: "text-[#79B8FF]",
  c: "italic text-[#6A6E66]",
  type: "text-[#79B8FF]",
  attr: "text-[#FFCC66]",
};

const KEYWORDS_TS = new Set([
  "import",
  "export",
  "from",
  "const",
  "let",
  "var",
  "function",
  "return",
  "async",
  "await",
  "new",
  "if",
  "else",
  "for",
  "while",
  "as",
  "type",
  "interface",
  "default",
  "true",
  "false",
  "null",
  "undefined",
  "this",
  "in",
  "of",
  "extends",
  "implements",
  "class",
  "throw",
  "try",
  "catch",
]);

const KEYWORDS_PRISMA = new Set([
  "model",
  "enum",
  "datasource",
  "generator",
  "type",
]);

const PRISMA_TYPES = new Set([
  "String",
  "Int",
  "Float",
  "Boolean",
  "DateTime",
  "Json",
  "Bytes",
  "BigInt",
  "Decimal",
]);

type Tok = { kind: Kind; value: string };

function tokenize(line: string, language: CodeFile["language"]): Tok[] {
  if (language === "json") return tokenizeJson(line);
  if (language === "prisma") return tokenizePrisma(line);
  return tokenizeTs(line);
}

function tokenizeTs(line: string): Tok[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) return [{ kind: "c", value: line }];

  const out: Tok[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) {
        if (line[j] === "\\") j += 2;
        else j++;
      }
      out.push({ kind: "str", value: line.slice(i, Math.min(j + 1, line.length)) });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      const next = line[j];
      if (KEYWORDS_TS.has(word)) out.push({ kind: "kw", value: word });
      else if (next === "(") out.push({ kind: "fn", value: word });
      else out.push({ kind: "txt", value: word });
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      out.push({ kind: "num", value: line.slice(i, j) });
      i = j;
      continue;
    }
    out.push({ kind: "txt", value: ch });
    i++;
  }
  return out;
}

function tokenizePrisma(line: string): Tok[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) return [{ kind: "c", value: line }];

  const out: Tok[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"') {
        if (line[j] === "\\") j += 2;
        else j++;
      }
      out.push({ kind: "str", value: line.slice(i, Math.min(j + 1, line.length)) });
      i = j + 1;
      continue;
    }
    if (ch === "@") {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_.]/.test(line[j])) j++;
      out.push({ kind: "attr", value: line.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (KEYWORDS_PRISMA.has(word)) out.push({ kind: "kw", value: word });
      else if (PRISMA_TYPES.has(word)) out.push({ kind: "type", value: word });
      else out.push({ kind: "txt", value: word });
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      out.push({ kind: "num", value: line.slice(i, j) });
      i = j;
      continue;
    }
    out.push({ kind: "txt", value: ch });
    i++;
  }
  return out;
}

function tokenizeJson(line: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"') {
        if (line[j] === "\\") j += 2;
        else j++;
      }
      const value = line.slice(i, Math.min(j + 1, line.length));
      const after = line.slice(j + 1).trimStart();
      out.push({ kind: after.startsWith(":") ? "fn" : "str", value });
      i = j + 1;
      continue;
    }
    if (/[0-9-]/.test(ch) && (i === 0 || /[\s,:\[]/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[0-9.eE+-]/.test(line[j])) j++;
      out.push({ kind: "num", value: line.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (word === "true" || word === "false" || word === "null") {
        out.push({ kind: "kw", value: word });
      } else {
        out.push({ kind: "txt", value: word });
      }
      i = j;
      continue;
    }
    out.push({ kind: "txt", value: ch });
    i++;
  }
  return out;
}
