import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { listProvidersForAdmin, type ProviderAdminView } from "@/lib/ai-providers";
import { ProviderCard } from "@/components/admin/provider-card";

export const dynamic = "force-dynamic";

export default async function AdminAIProvidersPage() {
  let providers: ProviderAdminView[];
  try {
    providers = await listProvidersForAdmin();
  } catch (err) {
    const isKeyMissing =
      err instanceof Error && err.message.includes("SECRETS_ENCRYPTION_KEY");
    return <AdminProvidersError isKeyMissing={isKeyMissing} />;
  }
  const enabled = providers.filter((p) => p.enabled).length;

  return <AdminProvidersContent providers={providers} enabled={enabled} />;
}

function AdminProvidersError({ isKeyMissing }: { isKeyMissing: boolean }) {
  const t = useTranslations("admin");
  return (
    <>
      <header className="mb-7">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
          AI <em className="italic">Providers</em>.
        </h1>
      </header>
      <div className="rounded-[12px] border border-dashed border-line-2 bg-surface p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-ink-2" />
          <div className="space-y-2 text-[13px]">
            <p className="font-semibold text-ink">
              {t("providers.encryptionMissing")}
            </p>
            <p className="text-muted">
              {isKeyMissing
                ? t("providers.encryptionMissingKeyDesc")
                : t("providers.encryptionErrorDesc")}
            </p>
            <p className="text-muted">
              {t("providers.encryptionFixHint")}{" "}
              <code className="font-mono text-ink-2">
                openssl rand -base64 32
              </code>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function AdminProvidersContent({
  providers,
  enabled,
}: {
  providers: ProviderAdminView[];
  enabled: number;
}) {
  const t = useTranslations("admin");
  const plural = providers.length > 1 ? "s" : "";
  const pluralActive = enabled > 1 ? "s" : "";

  return (
    <>
      <header className="mb-7">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
          AI <em className="italic">Providers</em>.
        </h1>
        <p className="mt-2 text-muted">
          {t("providers.subtitle", { enabled, total: providers.length, plural, pluralActive })}
        </p>
      </header>

      <div className="mb-6 rounded-[12px] border border-dashed border-line-2 bg-surface p-4 text-[13px] text-muted">
        <p>
          <strong className="font-semibold text-ink">{t("providers.priorityNote")}</strong>{" "}
          {t("providers.priorityNoteDesc")}{" "}
          <code className="font-mono">ANTHROPIC_API_KEY</code>,{" "}
          <code className="font-mono">MISTRAL_API_KEY</code>,{" "}
          <code className="font-mono">GEMINI_API_KEY</code>{" "}
          ou{" "}
          <code className="font-mono">GROQ_API_KEY</code>.
        </p>
        <Link
          href="/admin/settings/llm-routing"
          className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink-2 underline-offset-2 transition hover:underline"
        >
          {t("providers.goToRouting")}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {providers.map((p) => (
          <ProviderCard key={p.provider} view={p} />
        ))}
      </div>
    </>
  );
}
