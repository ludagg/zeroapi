import Link from "next/link";
import { useTranslations } from "next-intl";
import { Brand } from "@/components/landing/brand";

export function LandingFooter() {
  const t = useTranslations("landing.footer");

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Brand />
            <p>{t("tagline")}</p>
          </div>
          <div className="foot-col">
            <h4>{t("productTitle")}</h4>
            <ul>
              <li>
                <a href="/#produit">{t("features")}</a>
              </li>
              <li>
                <a href="/#tarifs">{t("pricing")}</a>
              </li>
              <li>
                <a href="/#demo">{t("demo")}</a>
              </li>
              <li>
                <a href="/#faq">{t("faq")}</a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>{t("resourcesTitle")}</h4>
            <ul>
              <li>
                <Link href="/docs">{t("docs")}</Link>
              </li>
              <li>
                <Link href="/docs/guides">{t("guides")}</Link>
              </li>
              <li>
                <Link href="/docs/api">{t("apiRef")}</Link>
              </li>
              <li>
                <Link href="/runtime">{t("runtime")}</Link>
              </li>
              <li>
                <Link href="/templates">{t("templates")}</Link>
              </li>
              <li>
                <Link href="/changelog">{t("changelog")}</Link>
              </li>
              <li>
                <a href="https://status.zeroapi.app" target="_blank" rel="noreferrer">
                  {t("status")}
                </a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>{t("companyTitle")}</h4>
            <ul>
              <li>
                <a href="mailto:bonjour@zeroapi.app">{t("contact")}</a>
              </li>
              <li>
                <a href="mailto:carrieres@zeroapi.app">{t("careers")}</a>
              </li>
              <li>
                <Link href="/legal-notice">{t("legalNotice")}</Link>
              </li>
              <li>
                <a href="mailto:presse@zeroapi.app">{t("press")}</a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>{t("legalTitle")}</h4>
            <ul>
              <li>
                <Link href="/terms">{t("terms")}</Link>
              </li>
              <li>
                <Link href="/privacy">{t("privacy")}</Link>
              </li>
              <li>
                <Link href="/cookies">{t("cookies")}</Link>
              </li>
              <li>
                <Link href="/security">{t("security")}</Link>
              </li>
              <li>
                <Link href="/gdpr">{t("gdpr")}</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>{t("copyright")}</span>
          <span className="made">
            <span className="flag" /> {t("madeIn")}
          </span>
        </div>
      </div>
    </footer>
  );
}
