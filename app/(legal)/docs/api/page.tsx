import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Reference — ZeroAPI",
  description:
    "Référence complète des endpoints REST générés par ZeroAPI : auth, CRUD, filtres, pagination, codes erreur.",
};

type Param = {
  name: string;
  type: string;
  required?: boolean;
  desc: string;
};

type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  desc: string;
  params?: Param[];
  example?: string;
};

const ENDPOINTS: { group: string; intro: string; eps: Endpoint[] }[] = [
  {
    group: "Authentification",
    intro:
      "Tous les endpoints d'authentification renvoient un access token JWT et un refresh token rotatif. Stocke le refresh token dans un cookie HTTP-only.",
    eps: [
      {
        method: "POST",
        path: "/auth/register",
        desc: "Crée un nouveau compte avec un email et un mot de passe. Envoie un email de vérification.",
        params: [
          { name: "email", type: "string", required: true, desc: "Email valide, non déjà utilisé." },
          { name: "password", type: "string", required: true, desc: "12 caractères minimum, complexité enforced." },
          { name: "name", type: "string", required: false, desc: "Nom affiché." },
        ],
      },
      {
        method: "POST",
        path: "/auth/login",
        desc: "Authentifie un utilisateur existant. Renvoie un access token et écrit un cookie de refresh.",
        params: [
          { name: "email", type: "string", required: true, desc: "Email du compte." },
          { name: "password", type: "string", required: true, desc: "Mot de passe en clair, hashé argon2id côté serveur." },
        ],
      },
      {
        method: "POST",
        path: "/auth/refresh",
        desc: "Échange un refresh token contre une nouvelle paire access + refresh.",
      },
      {
        method: "POST",
        path: "/auth/logout",
        desc: "Révoque le refresh token courant et clear le cookie associé.",
      },
    ],
  },
  {
    group: "Ressources CRUD",
    intro:
      "Pour chaque entité déclarée dans ton prompt, ZeroAPI génère ces cinq endpoints en respectant le RBAC configuré. Exemple ici sur la ressource users.",
    eps: [
      {
        method: "GET",
        path: "/users",
        desc: "Liste paginée des utilisateurs. Supporte filtres, tri et pagination cursor.",
        params: [
          { name: "filter[role]", type: "string", desc: "Filtre par rôle exact (`admin`, `customer`...)." },
          { name: "sort", type: "string", desc: "Champs séparés par virgule. Préfixe `-` pour DESC." },
          { name: "limit", type: "number", desc: "1–100 (défaut : 25)." },
          { name: "cursor", type: "string", desc: "Curseur opaque renvoyé par la requête précédente." },
        ],
      },
      {
        method: "POST",
        path: "/users",
        desc: "Crée une nouvelle ressource. Body validé par Zod selon le schéma déclaré.",
      },
      {
        method: "GET",
        path: "/users/:id",
        desc: "Récupère une ressource par son identifiant unique.",
      },
      {
        method: "PATCH",
        path: "/users/:id",
        desc: "Mise à jour partielle. Les champs absents sont laissés tels quels.",
      },
      {
        method: "DELETE",
        path: "/users/:id",
        desc: "Soft delete par défaut. Ajoute `?hard=true` pour supprimer définitivement (admin uniquement).",
      },
    ],
  },
  {
    group: "Fichiers et uploads",
    intro:
      "ZeroAPI génère deux endpoints pour gérer les fichiers via signed URLs vers un bucket S3-compatible (R2, Backblaze, AWS).",
    eps: [
      {
        method: "POST",
        path: "/files/sign",
        desc: "Demande une URL signée d'upload. Renvoie l'URL et le `key` final.",
        params: [
          { name: "filename", type: "string", required: true, desc: "Nom original du fichier." },
          { name: "contentType", type: "string", required: true, desc: "MIME type validé contre une whitelist." },
          { name: "size", type: "number", required: true, desc: "Taille en octets — limite configurable." },
        ],
      },
      {
        method: "POST",
        path: "/files/confirm",
        desc: "Confirme l'upload après PUT côté client. Crée la ligne de métadonnée en base.",
      },
    ],
  },
];

const ERRORS = [
  { code: 400, name: "Bad Request", desc: "Validation Zod en échec — voir le tableau `details`." },
  { code: 401, name: "Unauthorized", desc: "Token manquant, invalide ou expiré." },
  { code: 403, name: "Forbidden", desc: "Authentifié mais sans le rôle requis." },
  { code: 404, name: "Not Found", desc: "Ressource inexistante ou hors du tenant courant." },
  { code: 409, name: "Conflict", desc: "Contrainte d'unicité violée." },
  { code: 422, name: "Unprocessable", desc: "Format valide mais sémantique refusée (ex : transition d'état impossible)." },
  { code: 429, name: "Too Many Requests", desc: "Rate limit dépassé. Voir headers `RateLimit-*`." },
  { code: 500, name: "Server Error", desc: "Erreur interne. Tracée et notifiée à l'équipe." },
];

function MethodLabel({ m }: { m: Endpoint["method"] }) {
  return <span className={`docs-method ${m.toLowerCase()}`}>{m}</span>;
}

export default function ApiReferencePage() {
  return (
    <article className="docs-wrap">
      <header className="docs-head" style={{ textAlign: "left", marginBottom: 40 }}>
        <div className="eyebrow-row">
          <Link href="/docs">Documentation</Link> · API Reference
        </div>
        <h1>
          Référence <em>API</em>.
        </h1>
        <p style={{ margin: 0 }}>
          Base URL : <code>https://&lt;ton-projet&gt;.zeroapi.app</code>. Toutes les
          réponses sont en JSON, encodées en UTF-8, avec en-tête{" "}
          <code>Content-Type: application/json</code>.
        </p>
      </header>

      <div className="docs-article">
        <aside className="docs-sidebar">
          <h4>Endpoints</h4>
          <ul>
            {ENDPOINTS.map((g, i) => (
              <li key={g.group}>
                <a href={`#${g.group}`} className={i === 0 ? "active" : ""}>
                  {g.group}
                </a>
              </li>
            ))}
            <li>
              <a href="#errors">Codes d&apos;erreur</a>
            </li>
            <li>
              <a href="#rate-limits">Rate limits</a>
            </li>
          </ul>
          <div className="docs-side-group">
            <h4>Autres ressources</h4>
            <ul>
              <li>
                <Link href="/docs/getting-started">Getting Started</Link>
              </li>
              <li>
                <Link href="/docs/guides">Guides</Link>
              </li>
              <li>
                <Link href="/changelog">Changelog</Link>
              </li>
            </ul>
          </div>
        </aside>

        <div className="docs-body">
          <div className="docs-callout">
            <span className="docs-callout-icon">i</span>
            <div>
              Le code généré inclut une route <code>/openapi.json</code> et un Swagger
              UI sur <code>/docs</code>. Ce qui suit est la base commune ; ton schéma
              spécifique est servi par ton backend déployé.
            </div>
          </div>

          <h2 id="auth-header">Authentification</h2>
          <p>
            Toutes les routes protégées attendent un header :
          </p>
          <pre className="docs-code">
            <span className="k">Authorization</span>: Bearer{" "}
            <span className="s">&lt;access_token&gt;</span>
          </pre>

          {ENDPOINTS.map((g) => (
            <section key={g.group} id={g.group}>
              <h2>{g.group}</h2>
              <p>{g.intro}</p>
              {g.eps.map((ep) => (
                <div className="docs-endpoint" key={`${ep.method}-${ep.path}`}>
                  <div className="docs-endpoint-head">
                    <MethodLabel m={ep.method} />
                    <span className="docs-endpoint-path">{ep.path}</span>
                  </div>
                  <div className="docs-endpoint-body">
                    <p>{ep.desc}</p>
                    {ep.params && ep.params.length > 0 && (
                      <table className="docs-params">
                        <thead>
                          <tr>
                            <th>Paramètre</th>
                            <th>Type</th>
                            <th>Requis</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ep.params.map((p) => (
                            <tr key={p.name}>
                              <td>
                                <code>{p.name}</code>
                              </td>
                              <td>
                                <code>{p.type}</code>
                              </td>
                              <td>{p.required ? "oui" : "—"}</td>
                              <td>{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ))}
            </section>
          ))}

          <h2 id="errors">Codes d&apos;erreur</h2>
          <p>
            Format unifié pour toutes les erreurs :
          </p>
          <pre className="docs-code">
            {"{\n  "}
            <span className="k">&quot;error&quot;</span>: {"{\n    "}
            <span className="k">&quot;code&quot;</span>:{" "}
            <span className="s">&quot;VALIDATION_FAILED&quot;</span>,{"\n    "}
            <span className="k">&quot;message&quot;</span>:{" "}
            <span className="s">&quot;email doit être valide&quot;</span>,{"\n    "}
            <span className="k">&quot;details&quot;</span>: [ … ],{"\n    "}
            <span className="k">&quot;requestId&quot;</span>:{" "}
            <span className="s">&quot;req_01HABC…&quot;</span>
            {"\n  }\n}"}
          </pre>
          <table className="docs-params">
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {ERRORS.map((e) => (
                <tr key={e.code}>
                  <td>
                    <code>{e.code}</code>
                  </td>
                  <td>
                    <code>{e.name}</code>
                  </td>
                  <td>{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 id="rate-limits">Rate limits</h2>
          <p>
            Par défaut, 120 requêtes / minute par token authentifié, 60 / minute par IP
            non-authentifiée. Trois en-têtes sont retournés sur chaque réponse :{" "}
            <code>RateLimit-Limit</code>, <code>RateLimit-Remaining</code>,{" "}
            <code>RateLimit-Reset</code>. Modulable par endpoint dans le code généré.
          </p>
        </div>
      </div>
    </article>
  );
}
