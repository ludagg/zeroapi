import Link from "next/link";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/reveal";

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function Cross() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

type PlanDef = {
  key: "free" | "starter" | "pro" | "business";
  price: string;
  featured?: boolean;
  href: string;
  crossLast?: boolean;
};

const PLANS: PlanDef[] = [
  { key: "free", price: "0", href: "/register", crossLast: true },
  { key: "starter", price: "19", href: "/register?plan=starter" },
  { key: "pro", price: "49", featured: true, href: "/register?plan=pro" },
  { key: "business", price: "199", href: "mailto:ventes@zeroapi.app" },
];

export function Pricing() {
  const t = useTranslations("landing.pricing");

  return (
    <section id="tarifs">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">{t("kicker")}</span>
          <h2 className="display">
            {t("headlineLead")}
            <br />
            <em>{t("headlineAccent")}</em> {t("headlineRest")}
          </h2>
          <p>{t("sub")}</p>
        </Reveal>

        <div className="plans">
          {PLANS.map((plan, idx) => (
            <Reveal
              as="div"
              className={`plan${plan.featured ? " featured" : ""}`}
              delay={idx * 80}
              key={plan.key}
            >
              {plan.featured && <span className="plan-badge">{t("popular")}</span>}
              <div className="plan-name">{t(`${plan.key}.name`)}</div>
              <div className="plan-tag">{t(`${plan.key}.tag`)}</div>
              <div className="plan-price">
                {plan.price}
                <small>{t("perMonth")}</small>
              </div>
              <div className="plan-meta">{t(`${plan.key}.meta`)}</div>
              <div className="plan-divider" />
              <ul className="plan-feat-list">
                {[1, 2, 3, 4, 5].map((n) => {
                  const isCross = plan.crossLast && n === 5;
                  return (
                    <li key={n} className={isCross ? "dim" : undefined}>
                      {isCross ? <Cross /> : <Check />} {t(`${plan.key}.f${n}`)}
                    </li>
                  );
                })}
              </ul>
              {plan.href.startsWith("mailto:") ? (
                <a href={plan.href} className="btn btn-ghost">
                  {t(`${plan.key}.cta`)}
                </a>
              ) : (
                <Link
                  href={plan.href}
                  className={`btn ${plan.featured ? "btn-accent" : "btn-ghost"}`}
                >
                  {t(`${plan.key}.cta`)}
                </Link>
              )}
            </Reveal>
          ))}
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 32,
            fontSize: 13,
            color: "var(--muted)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          {t("mobileMoney")}
        </p>
      </div>
    </section>
  );
}
