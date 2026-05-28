import { z } from "zod";
import { parseSpec, ParseError, type ZeroAPISpec } from "@ludagg/zeroapi-runtime";

export type { ZeroAPISpec };
export { parseSpec, ParseError };

export const CONVERSATION_SYSTEM_PROMPT = `Tu es l'assistant de génération de ZeroAPI.
Tu aides l'utilisateur à définir son backend API en français.

STACK FIGÉE — NON NÉGOCIABLE :
- Le runtime cible est TOUJOURS @ludagg/zeroapi-runtime.
- Le framework HTTP est TOUJOURS Hono.js. Point final.
- Ne JAMAIS demander à l'utilisateur quel framework / langage / runtime il veut.
- Ne JAMAIS proposer Node.js + Express, NestJS, Fastify, Koa, FastAPI, Django, Flask, Rails, Spring, Go, etc.
- Si l'utilisateur demande un autre framework, réponds qu'il est imposé (Hono via ZeroAPI) et continue avec les ressources.

PHASE 1 — COMPRÉHENSION :
Tu explores activement le besoin métier, mais SANS submerger : maximum 2 questions à la fois,
adaptées au contexte. Couvre progressivement :

  RESSOURCES & RELATIONS
  - Les entités (ressources) du projet et leurs champs principaux
  - Les liens logiques entre ressources :
    · "Un Order appartient-il à un User ?" (manyToOne)
    · "Un Product a-t-il plusieurs Reviews ?" (oneToMany)
    · "Un Article peut-il avoir plusieurs Tags ?" (manyToMany — nécessite une table de jonction)
  - Propose explicitement les relations logiques quand tu les détectes.

  AUTHENTIFICATION
  - "Ton API a-t-elle besoin d'authentification ?"
  - Si oui, propose les options :
    · **JWT** (comptes utilisateurs avec register/login/refresh)
    · **API keys** (accès machine, intégrations B2B)
    · **OAuth** (Google / GitHub / Apple — exige JWT)
  - Ces stratégies peuvent se combiner.
  - Demande s'il y a plusieurs rôles distincts (admin, user, vendor, …).
  - Demande si certaines ressources doivent être **privées par utilisateur** (\`ownOnly\` :
    chaque user ne voit que ses propres lignes — nécessite JWT).

  FEATURES
  - "Besoin d'uploader des fichiers ou images ?" (avatars, photos produits, documents)
  - "Besoin de notifier d'autres systèmes (webhooks sortants) ?"
  - "Besoin de recevoir des webhooks (Stripe, GitHub, etc.) ?"
  - "Besoin de recherche / filtres avancés sur certains champs ?"
  - "Besoin d'un rate limit personnalisé pour le public vs les clés API ?"

DÉTECTION INTELLIGENTE (proposer avant de demander) :
- API e-commerce → propose **JWT** + relations \`User\` ↔ \`Order\` ↔ \`Product\` + \`fileUpload\`
  pour les images produit + \`ownOnly\` sur les commandes.
- API blog / CMS → propose **JWT** + relations \`Article\` → \`Comment\` (oneToMany),
  \`Article\` ↔ \`Tag\` (manyToMany) + \`ownOnly\` sur les articles.
- API SaaS B2B → propose **JWT + apikey** + RBAC \`owner/admin/member\` + webhooks sortants.
- API todo simple, prototype, démo → **rester minimal**, ne PAS imposer auth ni features.
- API publique read-only (catalogue, météo, données ouvertes) → pas d'auth obligatoire.

L'utilisateur valide ou ajuste — ne jamais imposer sans demander.

PHASE 2 — PLAN :
Quand tu as assez d'informations, présente un plan structuré (ressources, relations, auth,
features détectées) et demande validation.
Après validation explicite de l'utilisateur, le système génère DIRECTEMENT la ZeroAPISpec JSON.
Ne propose jamais d'étape intermédiaire de choix de stack.

RÈGLES :
- Toujours en français
- Maximum 2 questions à la fois
- Concis et précis
- Ne JAMAIS produire de JSON dans la conversation — attendre que l'utilisateur lance la génération
- Mettre en gras (**texte**) les éléments structurants détectés
- Utiliser des backticks pour les noms techniques
`;

/**
 * System prompt for the spec_generation task.
 * Describes the v0.14.0 ZeroAPI DSL — keeps full backwards compatibility with the
 * legacy single-strategy `auth.strategy` shape, while encouraging the modern
 * multi-strategy `auth.jwt`/`auth.apikey`/`auth.oauth` shape when justified by the
 * conversation. Also covers the new top-level blocks: `relations`, `permissions`,
 * `env`, `features`.
 */
export const SPEC_SYSTEM_PROMPT = `Tu génères UNIQUEMENT une Spec JSON validée par \`parseSpec()\` de @ludagg/zeroapi-runtime v0.14.
Le framework cible est TOUJOURS Hono.js — ne mentionne jamais Express, FastAPI ou un autre framework.

SHAPE EXACTE — tout écart sera rejeté :

{
  "version": "1.0",
  "name": "kebab-case",
  "description": "résumé en une phrase",

  "auth": {
    "enabled": true,
    "strategies": ["jwt", "apikey", "oauth"],
    "jwt":    { "enabled": true, "secretEnv": "JWT_SECRET", "accessTokenTTL": "15m", "refreshTokenTTL": "7d" },
    "apikey": { "enabled": true, "header": "X-API-Key", "prefix": "sk_" },
    "oauth":  { "providers": [
      { "name": "google", "clientIdEnv": "GOOGLE_CLIENT_ID", "clientSecretEnv": "GOOGLE_CLIENT_SECRET", "scopes": ["openid","email","profile"] }
    ]},
    "emailVerification": true,
    "passwordReset": true
  },

  "roles": [{ "name": "admin" }, { "name": "user" }],
  "rateLimit": { "windowMs": 60000, "max": 120 },

  "resources": [
    {
      "name": "PascalCase",
      "description": "...",
      "fields": {
        "title":    { "type": "string",  "required": true, "minLength": 1, "maxLength": 200 },
        "priceCfa": { "type": "integer", "required": true, "min": 0 },
        "image":    { "type": "file",    "accept": ["image/*"], "maxSize": "5MB", "storage": "r2" },
        "status":   { "type": "enum",    "values": ["draft","published","archived"] },
        "userId":   { "type": "uuid",    "required": true }
      },
      "endpoints": ["list", "create", "read", "update", "delete"],
      "rbac": { "read": ["user","admin"], "write": ["admin"], "delete": ["admin"] },
      "searchable": ["title", "description"],
      "relations": [
        { "type": "manyToOne", "resource": "User", "field": "userId", "onDelete": "Cascade" }
      ]
    }
  ],

  "relations": [
    { "from": "Order", "to": "User",    "type": "many-to-one", "field": "userId", "onDelete": "cascade" },
    { "from": "Article","to": "Tag",    "type": "many-to-many","field": "id",     "through": "ArticleTag" }
  ],

  "permissions": [
    { "resource": "Order", "rules": [
      { "role": "user",  "actions": ["create","read","update"], "ownOnly": true },
      { "role": "admin", "actions": ["create","read","update","delete"] }
    ]}
  ],

  "env": [
    { "name": "JWT_SECRET", "required": true, "generate": true, "managedByCloud": true },
    { "name": "STRIPE_SECRET_KEY", "required": false, "description": "Stripe API key (optional)" }
  ],

  "features": {
    "fileUpload": { "enabled": true, "provider": "r2", "maxSizeMB": 5, "allowedTypes": ["image/jpeg","image/png","image/webp"] },
    "webhooks":   { "outbound": ["order.created","order.paid"], "inbound": ["stripe"] },
    "search":     { "enabled": true, "fuzzy": true },
    "pagination": { "defaultLimit": 20, "maxLimit": 100 },
    "rateLimit":  { "perKey": "1000/min", "public": "60/min" }
  },

  "authFlows": { "passwordReset": true, "refreshTokens": true, "revocation": true }
}

TYPES DE CHAMP AUTORISÉS (literals minuscules exactement) :
  "string" | "text" | "number" | "integer" | "decimal" | "boolean"
  | "date" | "datetime" | "email" | "url" | "uuid"
  | "file" | "file[]" | "json" | "enum"
- \`enum\` exige \`values: ["a","b",...]\`.
- \`file\` / \`file[]\` accepte \`accept\`, \`maxSize\` (ex: "5MB"), \`storage\` (\`"r2"|"s3"|"local"\`).

AUTHENTIFICATION — deux formes acceptées :
1) Forme MODERNE (recommandée dès qu'il y a JWT, OAuth ou plusieurs stratégies) :
     "auth": { "enabled": true, "strategies": ["jwt"], "jwt": { "enabled": true } }
2) Forme LÉGACY (mono-stratégie simple) :
     "auth": { "strategy": "jwt" }   // "jwt" | "apikey" | "bearer" — TOUT EN MINUSCULES
- S'il n'y a PAS d'auth, OMETS complètement la clé \`auth\` — ne mets jamais \`"strategy":"none"\`.
- OAuth EXIGE \`auth.jwt.enabled: true\` (OAuth émet des JWT).
- \`apikey\` doit avoir \`"enabled": true\`.
- Providers OAuth supportés : \`"google"\`, \`"github"\`, \`"apple"\`.

RELATIONS :
- Par ressource (\`resources[].relations\`) — types : \`"oneToOne" | "oneToMany" | "manyToOne" | "manyToMany"\`.
- Top-level (\`spec.relations\`) — types : \`"one-to-one" | "one-to-many" | "many-to-one" | "many-to-many"\` (kebab-case).
- \`manyToMany\` / \`many-to-many\` EXIGE \`"through": "JoinTableName"\`.
- Le champ FK (\`field\`) doit exister sur la ressource source comme \`string\` ou \`uuid\`.
- Toute ressource référencée dans une relation doit exister dans \`resources\`.

PERMISSIONS (RBAC déclaratif top-level) :
- Une règle peut avoir \`"ownOnly": true\` → l'user ne voit/modifie que ses propres lignes.
- \`ownOnly\` EXIGE \`auth.jwt.enabled: true\` (pas pour rôle \`"public"\`).
- Les actions valides sont \`["create","read","update","delete"]\`.

NOMS RÉSERVÉS quand \`auth.jwt.enabled: true\` :
- \`User\`, \`RefreshToken\` ne peuvent PAS être des ressources spec (le runtime les gère).
- \`OAuthAccount\` est réservé si OAuth est configuré.

ENV :
- \`env[]\` déclare les variables d'environnement custom (Stripe, Twilio, etc.).
- \`generate: true\` → la valeur est créée automatiquement au déploiement.
- \`managedByCloud: true\` → géré par ZeroAPI Cloud.

FEATURES :
- \`features.fileUpload\` → upload S3/R2/local. \`provider\` obligatoire.
- \`features.webhooks\` → \`outbound\` (events émis) et \`inbound\` (sources Stripe/GitHub/…).
- \`features.search\` → cherche dans \`resource.searchable[]\`.
- \`features.pagination\` → limites par défaut.

RÈGLES DE GÉNÉRATION :
- \`version\` est OBLIGATOIRE et vaut TOUJOURS la chaîne "1.0".
- \`name\` est OBLIGATOIRE (kebab-case).
- \`resources\` contient AU MOINS UNE ressource, et chaque ressource AU MOINS UN champ.
- \`fields\` est un OBJET indexé par nom de champ — JAMAIS un tableau.
- Inférer les CRUD endpoints standards (\`["list","create","read","update","delete"]\`) sauf si l'user précise.
- Inclure auth/RBAC/permissions quand il y a plusieurs rôles ou \`ownOnly\` détecté.
- Identifier les paiements mobile money africains (mtn_momo, wave, orange_money) en \`customEndpoints\` + intégrations side-car.
- Si l'utilisateur a demandé un usage SIMPLE / minimal → ne génère PAS de bloc \`auth\`, ni \`permissions\`, ni \`features\` non sollicités.

RÈGLES DE SORTIE :
- Réponds par un OBJET JSON pur ({...}), RIEN d'autre.
- Pas de markdown, pas de balise \`\`\`json, pas de phrase d'introduction ou de conclusion.
`;

export type ConversationMessage = { role: "user" | "assistant"; content: string };

/**
 * Builds a system prompt for the modification chat that's tied to an existing
 * job. The current spec is embedded as JSON, the LLM is told to apply ONLY
 * what the user explicitly asks, and to present a diff before suggesting a
 * regeneration.
 */
export function buildModificationSystemPrompt(apiName: string, currentSpec: unknown): string {
  return `Tu modifies une API existante appelée "${apiName}".
Voici la spec ACTUELLE (référence — ne l'altère pas sans demande explicite) :

\`\`\`json
${JSON.stringify(currentSpec, null, 2)}
\`\`\`

RÈGLES STRICTES ANTI-RÉGRESSION :
1. Ne modifie QUE ce que l'utilisateur demande explicitement. Ne reformule pas, ne renomme pas, ne supprime pas de champ existant si ce n'est pas demandé.
2. Avant chaque modification, présente un diff structuré, exactement sous cette forme :
   + Ajout : <ce qui est ajouté>
   ~ Modification : <ce qui change>
   ✗ Suppression : <ce qui est retiré> (ou "rien")
3. Demande TOUJOURS confirmation avant une suppression (ressource, champ, endpoint, rôle).
4. La nouvelle version = ancienne spec + diff. Conserve tout ce qui n'est pas explicitement modifié.
5. Quand le diff est validé par l'utilisateur, propose-lui de lancer une régénération.
6. Réponds en français. Concis. Mets en gras (**texte**) les éléments structurants et utilise des backticks pour les noms techniques.
7. Ne produis JAMAIS de spec JSON dans la conversation — la régénération s'occupera de la transformation finale.
`;
}

export function estimateProgress(messages: ConversationMessage[]): number {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return 12;
  const totalChars = userMessages.reduce((sum, m) => sum + m.content.length, 0);
  let score = 20 + Math.min(50, userMessages.length * 12);
  if (totalChars > 200) score += 15;
  if (totalChars > 500) score += 10;
  if (totalChars > 1000) score += 5;
  return Math.min(94, score);
}

// ============================================================================
// LLM output normalization + pre-validation
// ----------------------------------------------------------------------------
// LLMs (Mistral especially) frequently emit small format drifts that crash
// parseSpec() with cryptic Zod errors: `"apiKey"` instead of `"apikey"`,
// `"int"` instead of `"integer"`, fields as an array of `{name,type,...}`,
// `nullable: true` instead of `required: false`, missing `version`, etc.
//
// `normalizeSpecCandidate` reshapes the LLM JSON into the exact format
// parseSpec() expects. `validateSpecCandidate` then runs a lightweight Zod
// pass that produces French error messages BEFORE the runtime's parseSpec
// kicks in — so /api/generate can surface "auth.strategy doit être 'jwt',
// 'apikey' ou 'bearer'" instead of the raw Zod issue path.
// ============================================================================

const VALID_FIELD_TYPES = [
  "string",
  "text",
  "number",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "email",
  "url",
  "uuid",
  "file",
  "file[]",
  "json",
  "enum",
] as const;

const VALID_AUTH_STRATEGIES = ["jwt", "apikey", "bearer"] as const;

const FIELD_TYPE_ALIASES: Record<string, (typeof VALID_FIELD_TYPES)[number]> = {
  string: "string",
  varchar: "string",
  char: "string",
  text: "text",
  longtext: "text",
  mediumtext: "text",
  number: "number",
  float: "number",
  double: "number",
  numeric: "number",
  decimal: "decimal",
  integer: "integer",
  int: "integer",
  bigint: "integer",
  smallint: "integer",
  boolean: "boolean",
  bool: "boolean",
  date: "date",
  datetime: "datetime",
  timestamp: "datetime",
  email: "email",
  url: "url",
  uri: "url",
  link: "url",
  uuid: "uuid",
  guid: "uuid",
  id: "uuid",
  file: "file",
  binary: "file",
  blob: "file",
  image: "file",
  "file[]": "file[]",
  files: "file[]",
  images: "file[]",
  attachments: "file[]",
  json: "json",
  jsonb: "json",
  object: "json",
  enum: "enum",
};

const AUTH_STRATEGY_ALIASES: Record<string, (typeof VALID_AUTH_STRATEGIES)[number]> = {
  jwt: "jwt",
  jsonwebtoken: "jwt",
  apikey: "apikey",
  bearer: "bearer",
  bearertoken: "bearer",
};

function canonKey(raw: string): string {
  return raw.toLowerCase().replace(/[\s_\-]/g, "");
}

function normalizeFieldType(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  // file[] is the only multichar literal we accept verbatim
  if (raw === "file[]") return "file[]";
  return FIELD_TYPE_ALIASES[canonKey(raw)] ?? raw;
}

function normalizeAuthStrategy(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const key = canonKey(raw);
  if (key === "" || key === "none" || key === "noauth" || key === "public") return null;
  return AUTH_STRATEGY_ALIASES[key] ?? raw;
}

function normalizeField(raw: unknown): unknown {
  if (typeof raw === "string") return { type: normalizeFieldType(raw) };
  if (!raw || typeof raw !== "object") return raw;
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };
  if ("type" in out) out.type = normalizeFieldType(out.type);
  if ("nullable" in out) {
    if (!("required" in out)) out.required = out.nullable === false;
    delete out.nullable;
  }
  if ("length" in out && typeof out.length === "number" && !("maxLength" in out)) {
    out.maxLength = out.length;
  }
  if ("length" in out) delete out.length;
  // enum field with `enum` array → migrate to `values`
  if (out.type === "enum" && !("values" in out) && Array.isArray((out as { enum?: unknown }).enum)) {
    out.values = (out as { enum: unknown[] }).enum;
    delete (out as { enum?: unknown }).enum;
  }
  return out;
}

function normalizeFields(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    const normalized: Record<string, unknown> = {};
    for (const entry of raw) {
      if (entry && typeof entry === "object" && typeof (entry as { name?: unknown }).name === "string") {
        const { name, ...rest } = entry as { name: string } & Record<string, unknown>;
        normalized[name] = normalizeField(rest);
      }
    }
    return normalized;
  }
  if (raw && typeof raw === "object") {
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      normalized[k] = normalizeField(v);
    }
    return normalized;
  }
  return raw;
}

const ALLOWED_CRUD = ["list", "create", "read", "update", "delete"] as const;

function normalizeEndpoints(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw;
  const cleaned = raw
    .map((e) => (typeof e === "string" ? e.toLowerCase().trim() : e))
    .filter((e): e is (typeof ALLOWED_CRUD)[number] =>
      typeof e === "string" && (ALLOWED_CRUD as readonly string[]).includes(e),
    );
  return cleaned.length > 0 ? cleaned : undefined;
}

// Per-resource relation types (camelCase)
const PER_RESOURCE_RELATION_TYPES = ["oneToOne", "oneToMany", "manyToOne", "manyToMany"] as const;
const PER_RESOURCE_RELATION_ALIASES: Record<string, (typeof PER_RESOURCE_RELATION_TYPES)[number]> = {
  onetoone: "oneToOne",
  onetomany: "oneToMany",
  manytoone: "manyToOne",
  manytomany: "manyToMany",
  hasone: "oneToOne",
  hasmany: "oneToMany",
  belongsto: "manyToOne",
};

// Top-level relation types (kebab-case)
const TOP_LEVEL_RELATION_TYPES = [
  "one-to-one",
  "one-to-many",
  "many-to-one",
  "many-to-many",
] as const;
const TOP_LEVEL_RELATION_ALIASES: Record<string, (typeof TOP_LEVEL_RELATION_TYPES)[number]> = {
  onetoone: "one-to-one",
  onetomany: "one-to-many",
  manytoone: "many-to-one",
  manytomany: "many-to-many",
};

function normalizeRelationType(raw: unknown, kind: "perResource" | "topLevel"): unknown {
  if (typeof raw !== "string") return raw;
  if (kind === "perResource") {
    if ((PER_RESOURCE_RELATION_TYPES as readonly string[]).includes(raw)) return raw;
    return PER_RESOURCE_RELATION_ALIASES[canonKey(raw)] ?? raw;
  }
  if ((TOP_LEVEL_RELATION_TYPES as readonly string[]).includes(raw)) return raw;
  return TOP_LEVEL_RELATION_ALIASES[canonKey(raw)] ?? raw;
}

const ON_DELETE_PER_RESOURCE_ALIASES: Record<string, "Cascade" | "SetNull" | "Restrict" | "NoAction"> = {
  cascade: "Cascade",
  setnull: "SetNull",
  restrict: "Restrict",
  noaction: "NoAction",
};
const ON_DELETE_TOP_LEVEL_ALIASES: Record<string, "cascade" | "set-null" | "restrict"> = {
  cascade: "cascade",
  setnull: "set-null",
  "set-null": "set-null",
  restrict: "restrict",
};

function normalizeOnDelete(raw: unknown, kind: "perResource" | "topLevel"): unknown {
  if (typeof raw !== "string") return raw;
  const key = canonKey(raw);
  if (kind === "perResource") {
    return ON_DELETE_PER_RESOURCE_ALIASES[key] ?? raw;
  }
  return ON_DELETE_TOP_LEVEL_ALIASES[raw.toLowerCase()] ?? ON_DELETE_TOP_LEVEL_ALIASES[key] ?? raw;
}

function normalizeResourceRelation(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  if ("type" in out) out.type = normalizeRelationType(out.type, "perResource");
  if ("onDelete" in out) out.onDelete = normalizeOnDelete(out.onDelete, "perResource");
  if ("target" in out && !("resource" in out)) {
    out.resource = out.target;
    delete out.target;
  }
  return out;
}

function normalizeTopLevelRelation(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  if ("type" in out) out.type = normalizeRelationType(out.type, "topLevel");
  if ("onDelete" in out) out.onDelete = normalizeOnDelete(out.onDelete, "topLevel");
  // Default `field` to "id" when LLM omits it (very common drift)
  if (!("field" in out) || typeof out.field !== "string" || out.field.length === 0) {
    out.field = "id";
  }
  return out;
}

function normalizeResource(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  if ("fields" in out) out.fields = normalizeFields(out.fields);
  if ("endpoints" in out) {
    const ep = normalizeEndpoints(out.endpoints);
    if (ep === undefined) delete out.endpoints;
    else out.endpoints = ep;
  }
  if (Array.isArray(out.relations)) {
    out.relations = out.relations.map(normalizeResourceRelation);
  }
  return out;
}

const VALID_OAUTH_PROVIDERS = ["google", "github", "apple"] as const;
const OAUTH_PROVIDER_ALIASES: Record<string, (typeof VALID_OAUTH_PROVIDERS)[number]> = {
  google: "google",
  googleoauth: "google",
  github: "github",
  gh: "github",
  apple: "apple",
  signinwithapple: "apple",
};

function normalizeOAuthProvider(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  if (typeof out.name === "string") {
    out.name = OAUTH_PROVIDER_ALIASES[canonKey(out.name)] ?? out.name;
  }
  // Common LLM drifts: clientId / clientSecret as literal values
  if (typeof out.clientId === "string" && !("clientIdEnv" in out)) {
    out.clientIdEnv = `${String(out.name ?? "OAUTH").toUpperCase()}_CLIENT_ID`;
    delete out.clientId;
  }
  if (typeof out.clientSecret === "string" && !("clientSecretEnv" in out)) {
    out.clientSecretEnv = `${String(out.name ?? "OAUTH").toUpperCase()}_CLIENT_SECRET`;
    delete out.clientSecret;
  }
  return out;
}

function normalizeAuth(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };

  // Legacy single-strategy: { strategy: "jwt" }
  if (typeof out.strategy === "string") {
    const strat = normalizeAuthStrategy(out.strategy);
    if (strat === null) {
      delete out.strategy;
    } else {
      out.strategy = strat;
    }
  }

  // Modern strategies[] — lowercase & filter
  if (Array.isArray(out.strategies)) {
    out.strategies = (out.strategies as unknown[])
      .map((s) => (typeof s === "string" ? canonKey(s) : s))
      .filter((s): s is "jwt" | "apikey" | "oauth" =>
        s === "jwt" || s === "apikey" || s === "oauth",
      );
  }

  // Modern jwt / apikey / oauth blocks
  if (out.jwt && typeof out.jwt === "object" && !Array.isArray(out.jwt)) {
    // ok — passthrough; nothing to normalize today
  }
  if (out.apikey && typeof out.apikey === "object" && !Array.isArray(out.apikey)) {
    const ak = out.apikey as Record<string, unknown>;
    if (!("enabled" in ak)) ak.enabled = true;
    out.apikey = ak;
  }
  // accept "apiKey" (camelCase drift)
  if (!("apikey" in out) && out.apiKey && typeof out.apiKey === "object") {
    const ak = out.apiKey as Record<string, unknown>;
    if (!("enabled" in ak)) ak.enabled = true;
    out.apikey = ak;
    delete out.apiKey;
  }
  if (out.oauth && typeof out.oauth === "object" && !Array.isArray(out.oauth)) {
    const oa = out.oauth as Record<string, unknown>;
    if (Array.isArray(oa.providers)) {
      oa.providers = (oa.providers as unknown[]).map(normalizeOAuthProvider);
    }
    out.oauth = oa;
  }

  return out;
}

const VALID_PERMISSION_ACTIONS = ["create", "read", "update", "delete"] as const;

function normalizePermission(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  if (Array.isArray(out.rules)) {
    out.rules = (out.rules as unknown[]).map((rule) => {
      if (!rule || typeof rule !== "object") return rule;
      const r = { ...(rule as Record<string, unknown>) };
      if (Array.isArray(r.actions)) {
        r.actions = (r.actions as unknown[])
          .map((a) => (typeof a === "string" ? a.toLowerCase().trim() : a))
          .filter((a): a is (typeof VALID_PERMISSION_ACTIONS)[number] =>
            typeof a === "string" && (VALID_PERMISSION_ACTIONS as readonly string[]).includes(a),
          );
      }
      return r;
    });
  }
  return out;
}

const VALID_STORAGE_PROVIDERS = ["s3", "r2", "local"] as const;

function normalizeFeatures(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };

  if (out.fileUpload && typeof out.fileUpload === "object" && !Array.isArray(out.fileUpload)) {
    const fu = { ...(out.fileUpload as Record<string, unknown>) };
    if (!("enabled" in fu)) fu.enabled = true;
    if (typeof fu.provider === "string") {
      const k = canonKey(fu.provider);
      if ((VALID_STORAGE_PROVIDERS as readonly string[]).includes(k)) fu.provider = k;
    }
    // Aliases: maxSize → maxSizeMB
    if ("maxSize" in fu && !("maxSizeMB" in fu) && typeof fu.maxSize === "number") {
      fu.maxSizeMB = fu.maxSize;
      delete fu.maxSize;
    }
    if (!Array.isArray(fu.allowedTypes)) fu.allowedTypes = [];
    out.fileUpload = fu;
  }

  if (out.search && typeof out.search === "object" && !Array.isArray(out.search)) {
    const s = { ...(out.search as Record<string, unknown>) };
    if (!("enabled" in s)) s.enabled = true;
    out.search = s;
  }

  return out;
}

/**
 * Reshapes raw LLM JSON into the exact format parseSpec() expects.
 * Idempotent — calling it on already-clean input is a no-op.
 */
export function normalizeSpecCandidate(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };

  if (typeof out.version !== "string" || out.version.length === 0) {
    out.version = "1.0";
  }

  if (out.auth && typeof out.auth === "object" && !Array.isArray(out.auth)) {
    const auth = normalizeAuth(out.auth) as Record<string, unknown>;
    // If only the legacy strategy field was provided and got removed (because
    // the LLM said "none"/"public"), drop the auth block entirely.
    const hasContent =
      typeof auth.strategy === "string" ||
      Array.isArray(auth.strategies) && (auth.strategies as unknown[]).length > 0 ||
      auth.jwt !== undefined ||
      auth.apikey !== undefined ||
      auth.oauth !== undefined ||
      auth.enabled === true;
    if (hasContent) {
      out.auth = auth;
    } else {
      delete out.auth;
    }
  } else if (out.auth !== undefined) {
    delete out.auth;
  }

  if (Array.isArray(out.resources)) {
    out.resources = out.resources.map(normalizeResource);
  }

  if (Array.isArray(out.relations)) {
    out.relations = out.relations.map(normalizeTopLevelRelation);
  }

  if (Array.isArray(out.permissions)) {
    out.permissions = out.permissions.map(normalizePermission);
  }

  if (out.features && typeof out.features === "object") {
    out.features = normalizeFeatures(out.features);
  }

  return out;
}

// Loose pre-validation: matches parseSpec's strict shape but with French
// error messages. We only assert the fields that are common LLM failure
// points; the runtime's parseSpec() remains the source of truth.
const FieldSchema = z
  .object({
    type: z.enum(VALID_FIELD_TYPES, {
      errorMap: () => ({
        message: `type doit être l'un de: ${VALID_FIELD_TYPES.join(", ")}`,
      }),
    }),
  })
  .passthrough();

const ResourceSchema = z
  .object({
    name: z
      .string({ required_error: "resource.name est requis" })
      .min(1, "resource.name ne peut pas être vide"),
    fields: z
      .record(z.string(), FieldSchema)
      .refine(
        (f) => Object.keys(f).length > 0,
        "chaque ressource doit définir au moins un champ",
      ),
  })
  .passthrough();

const LLMSpecSchema = z
  .object({
    version: z
      .string({ required_error: "Le champ 'version' est requis (toujours \"1.0\")" })
      .min(1, "Le champ 'version' ne peut pas être vide"),
    name: z
      .string({ required_error: "Le champ 'name' est requis" })
      .min(1, "Le champ 'name' ne peut pas être vide"),
    auth: z
      .object({
        // Legacy strategy
        strategy: z
          .enum(VALID_AUTH_STRATEGIES, {
            errorMap: () => ({
              message: "auth.strategy doit être 'jwt', 'apikey' ou 'bearer' (en minuscules)",
            }),
          })
          .optional(),
      })
      .passthrough()
      .optional(),
    resources: z
      .array(ResourceSchema, {
        required_error: "Le champ 'resources' est requis",
        invalid_type_error: "Le champ 'resources' doit être un tableau",
      })
      .min(1, "Le champ 'resources' doit contenir au moins une ressource"),
  })
  .passthrough();

/**
 * Cross-cuts the v0.14.0 invariants that parseSpec() also checks, but with
 * friendly French error messages so the clarifier can correct them BEFORE
 * surfacing the spec.
 */
function validateSemanticRules(spec: Record<string, unknown>): string | null {
  const resources = Array.isArray(spec.resources) ? (spec.resources as Array<Record<string, unknown>>) : [];
  const resourceNames = new Set(
    resources.map((r) => (typeof r.name === "string" ? r.name : "")).filter(Boolean),
  );

  // Per-resource relations: target must exist, manyToMany needs through
  for (const r of resources) {
    const rels = Array.isArray(r.relations) ? (r.relations as Array<Record<string, unknown>>) : [];
    for (const rel of rels) {
      const target = typeof rel.resource === "string" ? rel.resource : null;
      if (!target || !resourceNames.has(target)) {
        return `relation dans "${r.name}" → "${target ?? "?"}" : ressource cible inconnue`;
      }
      if (rel.type === "manyToMany" && (typeof rel.through !== "string" || rel.through.length === 0)) {
        return `relation manyToMany dans "${r.name}" → "${target}" : un champ "through" est requis (nom de la table de jonction)`;
      }
    }
  }

  // Top-level relations: from/to exist, many-to-many needs through
  const topRelations = Array.isArray(spec.relations) ? (spec.relations as Array<Record<string, unknown>>) : [];
  for (const rel of topRelations) {
    const from = typeof rel.from === "string" ? rel.from : null;
    const to = typeof rel.to === "string" ? rel.to : null;
    if (!from || !resourceNames.has(from)) {
      return `relation top-level "from" inconnue : "${from ?? "?"}"`;
    }
    if (!to || !resourceNames.has(to)) {
      return `relation top-level "${from}" → "${to ?? "?"}" : ressource cible inconnue`;
    }
    if (rel.type === "many-to-many" && (typeof rel.through !== "string" || rel.through.length === 0)) {
      return `relation top-level many-to-many "${from}" → "${to}" : un champ "through" est requis`;
    }
  }

  // ownOnly / oauth require auth.jwt.enabled === true
  const auth = (spec.auth && typeof spec.auth === "object" && !Array.isArray(spec.auth)
    ? (spec.auth as Record<string, unknown>)
    : null);
  const jwtBlock = auth?.jwt && typeof auth.jwt === "object" ? (auth.jwt as Record<string, unknown>) : null;
  const jwtEnabled = jwtBlock?.enabled === true || auth?.strategy === "jwt";

  const permissions = Array.isArray(spec.permissions)
    ? (spec.permissions as Array<Record<string, unknown>>)
    : [];
  for (const perm of permissions) {
    if (typeof perm.resource === "string" && !resourceNames.has(perm.resource)) {
      return `permission sur ressource inconnue : "${perm.resource}"`;
    }
    const rules = Array.isArray(perm.rules) ? (perm.rules as Array<Record<string, unknown>>) : [];
    for (const rule of rules) {
      if (rule.ownOnly === true) {
        if (rule.role === "public") {
          return `permission sur "${perm.resource}" : ownOnly + role "public" n'a pas de sens (pas d'identité)`;
        }
        if (!jwtEnabled) {
          return `permission ownOnly sur "${perm.resource}" : nécessite auth.jwt.enabled = true`;
        }
      }
    }
  }

  // OAuth providers require auth.jwt.enabled
  const oauth = auth?.oauth && typeof auth.oauth === "object" ? (auth.oauth as Record<string, unknown>) : null;
  const oauthProviders = Array.isArray(oauth?.providers) ? (oauth.providers as unknown[]) : [];
  if (oauthProviders.length > 0 && !(jwtBlock?.enabled === true)) {
    return `auth.oauth nécessite auth.jwt.enabled = true (OAuth émet des JWT)`;
  }

  return null;
}

/**
 * Validates a normalized LLM candidate with friendly French errors.
 * Returns the input as a `ZeroAPISpec`-shaped object on success.
 * Throws a plain Error (not ZodError) so callers can surface the message
 * directly in API responses.
 */
export function validateSpecCandidate(raw: unknown): unknown {
  const result = LLMSpecSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "spec"}: ${i.message}`)
      .join(" | ");
    throw new Error(`Spec JSON non conforme au schéma ZeroAPI — ${issues}`);
  }
  const semantic = validateSemanticRules(raw as Record<string, unknown>);
  if (semantic) {
    throw new Error(`Spec JSON non conforme — ${semantic}`);
  }
  return raw;
}

/**
 * Parses LLM output into a validated ZeroAPISpec.
 * Pipeline:
 *   1. Strip markdown fences
 *   2. JSON.parse — throws "JSON invalide: ..." on syntax errors
 *   3. normalizeSpecCandidate — fixes common LLM drifts (auth strategy
 *      casing, type aliases, array-of-fields → object-of-fields, etc.)
 *   4. validateSpecCandidate — Zod pre-check with French error messages
 *   5. parseSpec — runtime's strict Zod + relation integrity checks
 */
export function safeParseSpec(jsonText: string): ZeroAPISpec {
  let cleaned = jsonText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `Le JSON renvoyé par le LLM est invalide: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const normalized = normalizeSpecCandidate(raw);
  validateSpecCandidate(normalized);
  return parseSpec(normalized);
}

/** Counts the standard endpoints that would be generated for a spec. */
export function countEndpoints(spec: ZeroAPISpec): number {
  let n = 0;
  for (const r of spec.resources) {
    const ep = r.endpoints ?? ["list", "create", "read", "update", "delete"];
    n += ep.length;
    n += r.customEndpoints?.length ?? 0;
  }
  if (spec.authFlows?.passwordReset) n += 2;
  if (spec.authFlows?.refreshTokens) n += 1;
  if (spec.authFlows?.revocation) n += 1;
  if (spec.authFlows?.emailVerification) n += 1;
  // Phase 0.14 features
  if (spec.features?.fileUpload?.enabled) n += 2; // POST /upload, DELETE /upload/:key
  if (spec.features?.webhooks?.outbound?.length) n += 4; // admin CRUD on /admin/webhooks
  if (spec.features?.webhooks?.inbound?.length) {
    n += spec.features.webhooks.inbound.length; // 1 endpoint per inbound source
  }
  return n;
}
