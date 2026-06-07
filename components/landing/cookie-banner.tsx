"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "zeroapi-cookie-consent";

export function CookieBanner() {
  const t = useTranslations("landing.cookies");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const setConsent = (value: "accepted" | "declined") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-labelledby="cookie-banner-title">
      <p id="cookie-banner-title">
        <strong>{t("title")}</strong> {t("text")}{" "}
        <Link href="/cookies">{t("policyLink")}</Link>.
      </p>
      <div className="actions">
        <button type="button" className="decline" onClick={() => setConsent("declined")}>
          {t("refuse")}
        </button>
        <button type="button" className="accept" onClick={() => setConsent("accepted")}>
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
