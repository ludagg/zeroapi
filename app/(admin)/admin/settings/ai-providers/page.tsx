import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listProvidersForAdmin } from "@/lib/ai-providers";
import { ProviderCard } from "@/components/admin/provider-card";

export const dynamic = "force-dynamic";

export default async function AdminAIProvidersPage() {
  const providers = await listProvidersForAdmin();
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
