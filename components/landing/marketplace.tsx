import Link from "next/link";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/reveal";

type Tpl = {
  key: string;
  emoji: string;
  uses: string;
  official?: boolean;
  author?: string;
};

const TEMPLATES: Tpl[] = [
  { key: "ecommerce", emoji: "🛒", uses: "1,2k", official: true },
  { key: "transport", emoji: "🚌", uses: "840", official: true },
  { key: "clinic", emoji: "🏥", uses: "610", official: true },
  { key: "chat", emoji: "💬", uses: "590", author: "aminata.k" },
  { key: "stock", emoji: "📦", uses: "430", author: "kofi.dev" },
  { key: "learning", emoji: "🎓", uses: "380", author: "ENSEA" },
];

export function Marketplace() {
  const t = useTranslations("landing.marketplace");

  return (
    <section id="marketplace" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">{t("kicker")}</span>
          <h2 className="display">
            {t("headlineLead")} <em>{t("headlineAccent")}</em>,
            <br />
            {t("headlineRest")}
          </h2>
          <p>{t("sub")}</p>
        </Reveal>

        <Reveal as="div" className="mkt-grid" delay={80}>
          {TEMPLATES.map((tpl) => (
            <article className="mkt-card" key={tpl.key}>
              <div className="mkt-card-top">
                <span className="mkt-emoji" aria-hidden="true">
                  {tpl.emoji}
                </span>
                <span className={`mkt-badge${tpl.official ? " official" : ""}`}>
                  {tpl.official ? t("badgeOfficial") : t("badgeCommunity")}
                </span>
              </div>
              <h3 className="mkt-title">{t(`templates.${tpl.key}.title`)}</h3>
              <div className="mkt-meta">
                <span className="mkt-cat">{t(`templates.${tpl.key}.category`)}</span>
                <span className="mkt-uses">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  {t("uses", { count: tpl.uses })}
                </span>
              </div>
              <div className="mkt-foot">
                <span className="mkt-author">
                  {tpl.author ? t("by", { author: tpl.author }) : t("byZeroapi")}
                </span>
                <span className="mkt-use">{t("use")}</span>
              </div>
            </article>
          ))}
        </Reveal>

        <Reveal as="div" className="mkt-cta" delay={120}>
          <div className="mkt-publish">
            <div className="mkt-publish-toggle">
              <span className="mkt-pub-opt">{t("publishPrivate")}</span>
              <span className="mkt-pub-opt on">{t("publishPublic")}</span>
            </div>
            <p>{t("publishText")}</p>
          </div>
          <Link href="/templates" className="btn btn-ghost">
            {t("explore")}
            <svg
              className="arrow"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
