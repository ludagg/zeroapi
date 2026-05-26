import { Reveal } from "@/components/landing/reveal";

export function Features() {
  return (
    <section id="usages" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">Ce que ça génère</span>
          <h2 className="display">
            Pas des CRUD jouets.
            <br />
            <em>Des vrais backends.</em>
          </h2>
          <p>
            Relations entre tables, transactions atomiques, uploads, rôles — ZeroAPI
            gère ce que les démos d&apos;IA évitent.
          </p>
        </Reveal>

        <div className="features">
          <Reveal as="div" className="feat wide" delay={0}>
            <span className="feat-tag">CORE</span>
            <div className="feat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <ellipse cx="12" cy="5" rx="8" ry="3" />
                <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
              </svg>
            </div>
            <h3>Backends complexes</h3>
            <p>
              Relations 1-N et N-N, transactions atomiques, soft delete, audit trails.
              Filtrage, tri et pagination cursor sur chaque endpoint.
            </p>
            <div className="mini-code">
              <span className="ln">
                <span className="c">// auto-généré</span>
              </span>
              <span className="ln">
                <span className="k">app</span>.<span className="v">get</span>(
                <span className="s">&quot;/orders&quot;</span>,{" "}
                <span className="v">filter</span>(
                <span className="s">&quot;status,createdAt&quot;</span>),
              </span>
              <span className="ln">
                {"  "}
                <span className="v">sort</span>(
                <span className="s">&quot;-createdAt&quot;</span>),{" "}
                <span className="v">paginate</span>({"{"} cursor:{" "}
                <span className="s">&quot;id&quot;</span> {"}"}),
              </span>
              <span className="ln">
                {"  "}
                <span className="v">withRole</span>(
                <span className="s">&quot;admin&quot;</span>),{" "}
                <span className="v">listOrders</span>);
              </span>
            </div>
          </Reveal>

          <Reveal as="div" className="feat wide" delay={80}>
            <span
              className="feat-tag"
              style={{ background: "var(--ink)", color: "var(--bg)" }}
            >
              SÉCURITÉ
            </span>
            <div className="feat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6l9-4z" />
              </svg>
            </div>
            <h3>Sécurité par défaut</h3>
            <p>
              JWT, OAuth (Google, GitHub), rate limiting, validation Zod, échappement
              anti-XSS et anti-SQLi. Pas une checklist : c&apos;est dans le code généré.
            </p>
            <div className="mini-code">
              <span className="ln">
                <span className="k">app</span>.<span className="v">use</span>(
                <span className="v">helmet</span>(), <span className="v">cors</span>(),{" "}
                <span className="v">rateLimit</span>({"{"} <span className="k">rpm</span>
                : <span className="s">120</span> {"}"}));
              </span>
              <span className="ln">
                <span className="k">app</span>.<span className="v">use</span>(
                <span className="s">&quot;/admin/*&quot;</span>,{" "}
                <span className="v">auth</span>.<span className="v">jwt</span>(),{" "}
                <span className="v">requireRole</span>(
                <span className="s">&quot;admin&quot;</span>));
              </span>
              <span className="ln">
                <span className="c">// CSRF, XSS, SQLi → vérifiés ✓</span>
              </span>
            </div>
          </Reveal>

          <Reveal as="div" className="feat" delay={0}>
            <div className="feat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <h3>Tests générés</h3>
            <p>
              Suite Vitest pour chaque route, cas limites inclus. Couverture moyenne
              90%+.
            </p>
          </Reveal>

          <Reveal as="div" className="feat" delay={80}>
            <div className="feat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
            </div>
            <h3>Docs OpenAPI</h3>
            <p>
              Spec 3.1 interactive, Swagger UI, exemples curl. Toujours synchro avec ton
              code.
            </p>
          </Reveal>

          <Reveal as="div" className="feat" delay={160}>
            <div className="feat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
              </svg>
            </div>
            <h3>Déploiement multi-plateforme</h3>
            <p>
              Railway, Render, Vercel, Fly.io. Ou exporte le repo Git. Aucun vendor-lock.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
