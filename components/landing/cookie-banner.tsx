"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "zeroapi-cookie-consent";

export function CookieBanner() {
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
        <strong>🍪 Cookies.</strong> On utilise des cookies essentiels pour faire
        marcher le site (session, thème) et des cookies analytiques anonymes pour
        comprendre comment ZeroAPI est utilisé. Tu peux refuser sans casser quoi que ce
        soit. Détails dans notre{" "}
        <Link href="/cookies">politique cookies</Link>.
      </p>
      <div className="actions">
        <button type="button" className="decline" onClick={() => setConsent("declined")}>
          Refuser
        </button>
        <button type="button" className="accept" onClick={() => setConsent("accepted")}>
          Accepter
        </button>
      </div>
    </div>
  );
}
