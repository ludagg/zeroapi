"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { reportError } from "@/lib/report-error";

/**
 * Root segment error boundary — catches render/data errors in any page below
 * and offers recovery, while reporting the error to Sentry (when configured).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common.error");

  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-[40px] leading-none tracking-[-0.01em]">
          {t("title")}
        </h1>
        <p className="mt-3 text-muted">{t("description")}</p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-muted-2">
            {t("digest")}: {error.digest}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-2.5">
          <button type="button" onClick={reset} className="btn-primary">
            {t("retry")}
          </button>
          <Link
            href="/"
            className="rounded-[9px] border border-line px-4 py-2 text-[13px] transition hover:border-line-2"
          >
            {t("home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
