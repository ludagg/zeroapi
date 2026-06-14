import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { RuntimeDoc } from "@/components/runtime/runtime-doc";
import doc from "@/content/runtime-doc.json";

const NPM_URL = "https://www.npmjs.com/package/@ludagg/zeroapi-runtime";
const GITHUB_URL = "https://github.com/ludagg/zeroapi-runtime";
const INSTALL_CMD = "npm install @ludagg/zeroapi-runtime";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("runtime");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

type Stat = { value: string; label: string };
type Highlight = { title: string; body: string };

export default function RuntimePage() {
  const t = useTranslations("runtime");
  const stats = t.raw("stats") as Stat[];
  const highlights = t.raw("highlights") as Highlight[];

  return (
    <article className="docs-wrap">
      <header className="docs-head" style={{ textAlign: "left", marginBottom: 32 }}>
        <div className="eyebrow-row">{t("eyebrow")}</div>
        <h1>
          {t("title")} <em>{t("titleAccent")}</em> {t("titleRest")}
        </h1>
        <p style={{ margin: "0 0 24px" }}>{t("subtitle")}</p>

        <div className="mb-5 max-w-[460px]">
          <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-muted">
            {t("installLabel")}
          </span>
          <code className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-[var(--ink)] px-4 py-3 font-mono text-[13.5px] text-[rgba(245,246,242,0.92)]">
            <span>
              <span className="text-[rgba(245,246,242,0.4)]">$ </span>
              {INSTALL_CMD}
            </span>
          </code>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-accent px-5 text-[14.5px] font-semibold text-accent-ink transition hover:-translate-y-px hover:shadow-[0_8px_22px_var(--accent-glow)]"
          >
            {t("ctaTry")}
          </Link>
          <a
            href={NPM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-5 text-[14.5px] font-medium text-ink transition hover:-translate-y-px hover:border-line-2"
          >
            {t("ctaNpm")}
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-5 text-[14.5px] font-medium text-ink transition hover:-translate-y-px hover:border-line-2"
          >
            {t("ctaGithub")}
          </a>
        </div>
      </header>

      <div className="mb-12 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface px-4 py-5 text-center">
            <div className="font-mono text-[26px] font-semibold leading-none text-ink">
              {s.value}
            </div>
            <div className="mt-2 text-[12.5px] leading-snug text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="mb-14">
        <h2 className="mb-6 font-serif text-[26px] leading-tight text-ink">
          {t("highlightsTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((h) => (
            <div
              key={h.title}
              className="rounded-[14px] border border-line bg-surface p-5 transition hover:border-line-2"
            >
              <h3 className="mb-1.5 text-[15.5px] font-semibold text-ink">{h.title}</h3>
              <p className="text-[14px] leading-relaxed text-ink-2">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line pt-12">
        <div className="eyebrow-row">{t("docTitle")}</div>
        <h2 className="mb-2 font-serif text-[30px] leading-tight text-ink">{t("docTitle")}</h2>
        <p className="mb-3 max-w-[680px] text-[15.5px] leading-relaxed text-ink-2">
          {t("docSubtitle")}
        </p>
        <p className="mb-8 text-[13px] italic text-muted">{t("docNote")}</p>

        <RuntimeDoc markdown={doc.markdown} tocLabel={t("onThisPage")} />
      </section>
    </article>
  );
}
