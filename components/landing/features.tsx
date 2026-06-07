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
              Filtrage, tri et pagination cursor sur chaque endpoint — avec une suite
              Vitest générée par-dessus.
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3>Conversationnel</h3>
            <p>
              Kia, l&apos;architecte d&apos;API, dialogue avec toi et construit la spec en
              direct. Tu ajustes en parlant — pas de JSON à écrire à la main.
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
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
              </svg>
            </div>
            <h3>Multi-IA</h3>
            <p>
              Routage intelligent entre Claude, Mistral et Gemini selon ton plan, avec
              bascule automatique en cas de panne. Jamais bloqué sur un seul fournisseur.
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
                <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
              </svg>
            </div>
            <h3>Dev Mode</h3>
            <p>
              Exporte depuis la spec en direct : OpenAPI 3.1, SDK TypeScript, collection
              Postman, schéma Prisma, diagramme ER Mermaid et bundle ZIP complet.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
