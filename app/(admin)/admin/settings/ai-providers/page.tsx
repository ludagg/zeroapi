import Link from "next/link";
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
                Configuration de chiffrement indisponible
              </p>
              <p className="text-muted">
                {isKeyMissing
                  ? "La variable d'environnement SECRETS_ENCRYPTION_KEY est manquante ou invalide (32 bytes base64 requis). Les clés des providers ne peuvent pas être lues."
                  : "Impossible de charger la configuration des providers."}
              </p>
              <p className="text-muted">
                Définis la variable côté hébergeur puis redéploie. Génération&nbsp;:{" "}
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
  const enabled = providers.filter((p) => p.enabled).length;

  return (
    <>
      <header className="mb-7">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
          AI <em className="italic">Providers</em>.
        </h1>
        <p className="mt-2 text-muted">
          {enabled} / {providers.length} provider{providers.length > 1 ? "s" : ""} actif
          {enabled > 1 ? "s" : ""}. Les clés sont chiffrées AES-256-GCM avant stockage.
        </p>
      </header>

      <div className="mb-6 rounded-[12px] border border-dashed border-line-2 bg-surface p-4 text-[13px] text-muted">
        <p>
          <strong className="font-semibold text-ink">Ordre de priorité :</strong> la clé saisie ici
          écrase la variable d&apos;environnement correspondante. Sans clé saisie, ZeroAPI retombe
          sur <code className="font-mono">ANTHROPIC_API_KEY</code>,{" "}
          <code className="font-mono">MISTRAL_API_KEY</code>,{" "}
          <code className="font-mono">GEMINI_API_KEY</code> ou{" "}
          <code className="font-mono">GROQ_API_KEY</code>.
        </p>
        <Link
          href="/admin/settings/llm-routing"
          className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink-2 underline-offset-2 transition hover:underline"
        >
          Aller au routage par plan
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
