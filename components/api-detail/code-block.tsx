import { highlight, type HighlightLang } from "@/lib/highlight";

export async function CodeBlock({
  code,
  lang,
  filename,
  maxHeight,
}: {
  code: string;
  lang: HighlightLang;
  filename?: string;
  maxHeight?: string;
}) {
  const html = await highlight(code, lang);
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
      {filename && (
        <div className="flex items-center justify-between border-b border-line bg-bg-2 px-3 py-2">
          <span className="font-mono text-[11.5px] text-ink-2">{filename}</span>
          <span className="rounded-[5px] border border-line bg-surface px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.05em] text-muted">
            {lang}
          </span>
        </div>
      )}
      <div
        className="shiki-host overflow-auto scrollbar-thin"
        style={{ maxHeight: maxHeight ?? "60vh" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
