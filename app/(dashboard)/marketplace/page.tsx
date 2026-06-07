import { DashboardHeader } from "@/components/dashboard/header";
import { MarketplaceBrowser } from "@/components/marketplace/marketplace-browser";
import { requireUser } from "@/lib/session";
import { loadMarketplace } from "@/lib/marketplace";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const t = useTranslations("dashboard");
  await requireUser();
  const { official, community, categories } = await loadMarketplace();

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: t("header.workspace"), href: "/dashboard" },
          { label: t("nav.marketplace") },
        ]}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-7">
          <header className="mb-6">
            <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] sm:text-[44px] sm:leading-none">
              <em className="italic">Marketplace</em>.
            </h1>
            <p className="mt-2 text-[14.5px] text-muted">
              {t("marketplace.subtitle")}
            </p>
          </header>

          <MarketplaceBrowser official={official} community={community} categories={categories} />
        </div>
      </div>
    </>
  );
}
