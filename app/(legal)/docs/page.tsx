import Link from "next/link";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("docs.meta.title"),
    description: t("docs.meta.description"),
  };
}

const ICONS: Record<string, React.ReactNode> = {
  "/docs/getting-started": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  "/docs/guides": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  "/docs/api": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

type Card = {
  href: string;
  title: string;
  desc: string;
  items: string[];
  cta: string;
};

export default function DocsIndexPage() {
  const t = useTranslations("legal");
  const cards = t.raw("docs.cards") as Card[];

  return (
    <article className="docs-wrap">
      <header className="docs-head">
        <div className="eyebrow-row">{t("docs.eyebrow")}</div>
        <h1>
          {t("docs.title")} <em>{t("docs.titleAccent")}</em> {t("docs.titleRest")}
        </h1>
        <p>{t("docs.intro")}</p>
      </header>

      <div className="docs-grid">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="docs-card">
            <span className="docs-card-icon">{ICONS[c.href]}</span>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <ul>
              {c.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
            <span className="docs-card-link">
              <span>{c.cta}</span>
              <span>→</span>
            </span>
          </Link>
        ))}
      </div>
    </article>
  );
}
