import { Reveal } from "@/components/landing/reveal";

function Yes({ strong = false }: { strong?: boolean }) {
  return (
    <span className={`cmp-cell yes${strong ? " strong" : ""}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <span className="sr">oui</span>
    </span>
  );
}

function No() {
  return (
    <span className="cmp-cell no">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
      <span className="sr">non</span>
    </span>
  );
}

function Partial({ label }: { label: string }) {
  return <span className="cmp-cell partial">{label}</span>;
}

function Txt({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) {
  return <span className={`cmp-cell text${dim ? " dim" : ""}`}>{children}</span>;
}

const ROWS: Array<{
  label: string;
  zeroapi: React.ReactNode;
  supabase: React.ReactNode;
  firebase: React.ReactNode;
}> = [
  {
    label: "Approche",
    zeroapi: <Txt>Génération IA depuis prompt FR / EN</Txt>,
    supabase: <Txt dim>Schéma SQL + auto-API</Txt>,
    firebase: <Txt dim>SDK propriétaire</Txt>,
  },
  {
    label: "Code source livré",
    zeroapi: <Yes strong />,
    supabase: <No />,
    firebase: <No />,
  },
  {
    label: "Sans vendor-lock",
    zeroapi: <Yes strong />,
    supabase: <Partial label="partiel" />,
    firebase: <No />,
  },
  {
    label: "Hébergement libre (Railway, Fly, Vercel…)",
    zeroapi: <Yes />,
    supabase: <Partial label="self-host complexe" />,
    firebase: <No />,
  },
  {
    label: "Logique métier complexe",
    zeroapi: <Yes />,
    supabase: <Partial label="Edge Functions" />,
    firebase: <Partial label="Cloud Functions" />,
  },
  {
    label: "Tests unitaires générés",
    zeroapi: <Yes strong />,
    supabase: <No />,
    firebase: <No />,
  },
  {
    label: "Docs OpenAPI 3.1",
    zeroapi: <Yes />,
    supabase: <Partial label="postgREST" />,
    firebase: <No />,
  },
  {
    label: "Paiement Mobile Money",
    zeroapi: <Yes strong />,
    supabase: <No />,
    firebase: <No />,
  },
  {
    label: "Prompt en français / pidgin",
    zeroapi: <Yes strong />,
    supabase: <No />,
    firebase: <No />,
  },
  {
    label: "Tarif d'entrée",
    zeroapi: <Txt>0 FCFA</Txt>,
    supabase: <Txt dim>0 $ · payant dès trafic</Txt>,
    firebase: <Txt dim>0 $ · pay-as-you-go</Txt>,
  },
];

export function Comparison() {
  return (
    <section id="comparaison" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">Comparaison</span>
          <h2 className="display">
            ZeroAPI vs <em>les BaaS classiques</em>.
          </h2>
          <p>
            Supabase et Firebase t&apos;enferment dans leur écosystème. ZeroAPI te livre
            le code — c&apos;est ton repo, tes serveurs, ta liberté.
          </p>
        </Reveal>

        <Reveal as="div" className="cmp-card" delay={80}>
          <div className="cmp-scroll">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th scope="col" className="cmp-row-label">
                    <span className="cmp-th-label">Caractéristique</span>
                  </th>
                  <th scope="col" className="cmp-col-zeroapi">
                    <div className="cmp-th">
                      <span className="cmp-th-name">ZeroAPI</span>
                      <span className="cmp-th-badge">★ recommandé</span>
                    </div>
                  </th>
                  <th scope="col">
                    <div className="cmp-th">
                      <span className="cmp-th-name">Supabase</span>
                    </div>
                  </th>
                  <th scope="col">
                    <div className="cmp-th">
                      <span className="cmp-th-name">Firebase</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="cmp-row-label">
                      {row.label}
                    </th>
                    <td className="cmp-col-zeroapi">{row.zeroapi}</td>
                    <td>{row.supabase}</td>
                    <td>{row.firebase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cmp-foot">
            <span className="cmp-foot-note">
              Comparatif établi en mai 2026 sur la base des offres publiques. Pas de
              tacle — chaque outil a son usage. Si tu veux vraiment du SQL brut, prends
              Supabase. Si tu veux du temps réel mobile, Firebase. Si tu veux un backend
              custom livré clé en main, prends ZeroAPI.
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
