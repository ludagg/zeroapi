import Link from "next/link";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("templates.meta.title"),
    description: t("templates.meta.description"),
  };
}

type Template = {
  slug: string;
  name: string;
  category: string;
  glyph: string;
  blurb: string;
  tags: string[];
  endpoints: number;
  generations: string;
  rating: string;
};

const GLYPHS: Record<string, string> = {
  "ecommerce-mobile-money": "🛒",
  "marketplace": "🏪",
  "transport-reservation": "🚌",
  "chat-realtime": "💬",
  "crm": "📇",
  "saas-multi-tenant": "⚡",
};

export default function TemplatesPage() {
  const t = useTranslations("legal");
  const items = t.raw("templates.items") as Template[];

  return (
    <article className="templates-wrap">
      <header className="templates-head">
        <div className="eyebrow-row">{t("templates.eyebrow")}</div>
        <h1>
          {t("templates.title")} <em>{t("templates.titleAccent")}</em>.
        </h1>
        <p>{t("templates.intro")}</p>
      </header>

      <div className="templates-grid">
        {items.map((tpl) => (
          <div key={tpl.slug} className="tpl-card">
            <div className="tpl-card-preview">
              <div className="tpl-card-glyph" aria-hidden>
                {GLYPHS[tpl.slug]}
              </div>
            </div>
            <div className="tpl-card-body">
              <div className="tpl-card-head">
                <h3>{tpl.name}</h3>
                <span className="tpl-card-meta">{tpl.category}</span>
              </div>
              <p>{tpl.blurb}</p>
              <div className="tpl-card-tags">
                {tpl.tags.map((tag) => (
                  <span key={tag} className="tpl-card-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="tpl-card-foot">
              <div className="tpl-card-stats">
                <span>{tpl.endpoints} {t("templates.endpointsLabel")}</span>
                <span>★ {tpl.rating}</span>
              </div>
              <Link
                href={`/register?template=${tpl.slug}`}
                className="tpl-card-use"
              >
                {t("templates.useLabel")} <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: 56,
          fontFamily: "var(--font-mono), monospace",
          fontSize: 13,
          color: "var(--muted)",
        }}
      >
        {t("templates.suggestIntro")}{" "}
        <a
          href="mailto:bonjour@zeroapi.app"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            textDecorationColor: "var(--accent)",
          }}
        >
          {t("templates.suggestLink")}
        </a>{" "}
        {t("templates.suggestOutro")}
      </div>
    </article>
  );
}
