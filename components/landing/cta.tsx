import Link from "next/link";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/reveal";

export function CTA() {
  const t = useTranslations("landing.cta");
  const tc = useTranslations("common.actions");
  return (
    <section id="cta" style={{ paddingBottom: 40 }}>
      <div className="wrap">
        <Reveal as="div" className="cta-final">
          <h2 className="display">
            {t("headlineLead")}
            <br />
            {t("headlineRest")} <em>{t("headlineAccent")}</em>
          </h2>
          <p>{t("sub")}</p>
          <div className="hero-ctas">
            <Link href="/register" className="btn btn-accent btn-lg">
              {tc("startFree")}
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
            <a href="mailto:bonjour@zeroapi.app" className="btn btn-ghost btn-lg">
              {t("talkToHuman")}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
