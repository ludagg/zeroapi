import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("common.notFound");
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6">
      <div className="max-w-md text-center">
        <div className="mb-2 font-mono text-[13px] uppercase tracking-[0.18em] text-muted-2">
          404
        </div>
        <h1 className="font-serif text-[40px] leading-none tracking-[-0.01em]">
          {t("title")}
        </h1>
        <p className="mt-3 text-muted">{t("description")}</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
