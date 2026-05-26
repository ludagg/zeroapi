import { codeToHtml, type BundledLanguage } from "shiki";

const SUPPORTED: Record<string, BundledLanguage> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  json: "json",
  prisma: "prisma",
  toml: "toml",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
};

export type HighlightLang = keyof typeof SUPPORTED;

export async function highlight(code: string, lang: HighlightLang): Promise<string> {
  const language = SUPPORTED[lang] ?? "typescript";
  try {
    return await codeToHtml(code, {
      lang: language,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    });
  } catch {
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre><code>${escaped}</code></pre>`;
  }
}
