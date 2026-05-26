import { DeployButtons } from "@/components/api-detail/deploy-buttons";
import type { DeployTarget } from "@/lib/api-detail";

export function DeployPanel({ targets }: { targets: DeployTarget[] }) {
  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Déployer en un clic</h2>
        <p className="mt-1 text-[12.5px] text-muted">
          Choisis ta cible. Chaque bouton ouvre la configuration générée prête à copier.
        </p>
      </header>

      <DeployButtons targets={targets} />

      <div className="rounded-[12px] border border-line bg-surface p-4">
        <h3 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
          3 étapes pour déployer
        </h3>
        <ol className="space-y-2 text-[13px] text-ink-2">
          <Step n={1}>
            Télécharge le ZIP du projet et décompresse-le sur ton ordinateur.
          </Step>
          <Step n={2}>
            Crée ton projet sur la plateforme cible (Railway, Render, Vercel ou Fly.io)
            et lie le repo Git.
          </Step>
          <Step n={3}>
            Copie le fichier de configuration ci-dessus à la racine du projet,
            commit, push — la plateforme déploie automatiquement.
          </Step>
        </ol>
      </div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-bg-2 font-mono text-[10.5px] font-semibold text-ink-2">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
