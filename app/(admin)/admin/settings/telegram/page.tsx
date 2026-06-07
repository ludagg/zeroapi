import { getTranslations } from "next-intl/server";
import { getTelegramAdminView } from "@/lib/app-settings";
import { TelegramSettings } from "@/components/admin/telegram-settings";

export const dynamic = "force-dynamic";

export default async function AdminTelegramPage() {
  const t = await getTranslations("admin");
  const view = await getTelegramAdminView();

  return (
    <>
      <header className="mb-6">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
          {t("telegram.title")}<em className="italic">{t("telegram.titleEm")}</em>.
        </h1>
        <p className="mt-2 max-w-2xl text-muted">{t("telegram.subtitle")}</p>
      </header>

      <TelegramSettings view={view} />
    </>
  );
}
