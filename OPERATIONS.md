# OPERATIONS.md — Conception du système d'opérations de spec

> Document de **conception** (pas d'implémentation). Décrit comment un agent
> modifie la `ZeroAPISpec` JSON de façon **incrémentale et ciblée**, sans la
> régénérer à zéro. La spec reste la source de vérité ; **le code applique les
> changements, pas le LLM**.
>
> Projet : ZeroAPI · Runtime cible : `@ludagg/zeroapi-runtime` v0.16 · Framework : Hono.js

---

## 0. Problème & principe directeur

Aujourd'hui, modifier une API passe par `buildModificationSystemPrompt()`
(`lib/spec.ts:232`) : on injecte **toute la spec** dans le prompt et on demande
au LLM de la régénérer. Conséquences :

- **Dérive** : le LLM reformule, renomme ou perd des champs non demandés.
- **Coût/latence** : on régénère 100 % de la spec pour changer 1 champ.
- **Non-déterminisme** : deux régénérations identiques peuvent diverger.

**Principe directeur de cette conception :**

```
LLM  →  émet des APPELS D'OUTILS (nom d'opération + arguments typés)
CODE →  exécute des fonctions pures (spec, args) → newSpec
CODE →  valide via le pipeline EXISTANT (normalize → validate → parseSpec)
```

Le LLM **ne produit jamais de JSON de spec**. Il choisit *quelle* opération
appliquer et avec *quels* arguments. Le code détient la logique de mutation et
la garantie de validité. Toute opération laisse la spec dans un état **valide**
ou est **rejetée sans effet** (transactionnel).

---

# ÉTAPE 1 — Audit de la structure réelle de la Spec

Source de vérité : type `ZeroAPISpec` exporté par `@ludagg/zeroapi-runtime`
(`lib/spec.ts:2`), reflété par la `SPEC_SYSTEM_PROMPT` (`lib/spec.ts:82-222`) et
par la validation locale (`VALID_*`, `validateSemanticRules`). Voici **tous les
éléments modifiables**, tirés du code réel.

### 1.1 Méta top-level

| Clé | Type | Notes (réf. code) |
|---|---|---|
| `version` | `string` | **Toujours `"1.0"`** — non modifiable (`lib/spec.ts:210`, `:664`) |
| `name` | `string` (kebab-case) | Obligatoire (`LLMSpecSchema`, `lib/spec.ts:739`) |
| `description` | `string?` | Optionnel |
| `roles` | `{ name: string }[]` | Ex. `[{name:"admin"},{name:"user"}]` (`lib/spec.ts:104`) |
| `rateLimit` | `{ windowMs:number, max:number }` | Rate limit global (`lib/spec.ts:105`) |

### 1.2 `auth` (deux formes acceptées)

Forme **moderne** (`lib/spec.ts:92-102`, `:162-170`) :

```jsonc
"auth": {
  "enabled": true,
  "strategies": ["jwt", "apikey", "oauth"],          // filtré: jwt|apikey|oauth
  "jwt":    { "enabled": true, "secretEnv": "JWT_SECRET",
              "accessTokenTTL": "15m", "refreshTokenTTL": "7d" },
  "apikey": { "enabled": true, "header": "X-API-Key", "prefix": "sk_" },
  "oauth":  { "providers": [
    { "name": "google", "clientIdEnv": "...", "clientSecretEnv": "...",
      "scopes": ["openid","email","profile"] }
  ]},
  "emailVerification": true,
  "passwordReset": true
}
```

Forme **légacy** (mono-stratégie) : `"auth": { "strategy": "jwt" }`.

- Stratégies légales : **`jwt` | `apikey` | `bearer`** (`VALID_AUTH_STRATEGIES`, `lib/spec.ts:302`).
- Providers OAuth supportés : **`google` | `github` | `apple`** (`VALID_OAUTH_PROVIDERS`, `lib/spec.ts:524`).
- Si pas d'auth → la clé `auth` est **omise** (jamais `"strategy":"none"`, `lib/spec.ts:167`, `:684`).

### 1.3 `resources[]`

| Clé | Type | Notes |
|---|---|---|
| `name` | `string` (PascalCase) | Obligatoire, non vide (`ResourceSchema`, `lib/spec.ts:723`) |
| `description` | `string?` | |
| `fields` | **objet** indexé par nom de champ | ≥ 1 champ requis (`lib/spec.ts:727`) ; **jamais un tableau** (`lib/spec.ts:213`) |
| `endpoints` | `("list"\|"create"\|"read"\|"update"\|"delete")[]` | `ALLOWED_CRUD` (`lib/spec.ts:415`) ; défaut = les 5 |
| `rbac` | `{ read:string[], write:string[], delete:string[] }` | Rôles autorisés par action (`lib/spec.ts:119`) |
| `searchable` | `string[]` | Noms de champs cherchables (`lib/spec.ts:120`) |
| `relations` | relation **par ressource** (cf. 1.4) | |
| `customEndpoints` | `unknown[]` | Endpoints custom (mobile money, etc. — `lib/spec.ts:216`, `:1026`) |

#### Champs (`fields[name]`)

Types légaux (`VALID_FIELD_TYPES`, `lib/spec.ts:284-300`, en minuscules) :

```
string · text · number · integer · decimal · boolean · date · datetime
email · url · uuid · file · file[] · json · enum
```

Options de champ observées (selon le type) :

| Option | S'applique à | Réf. |
|---|---|---|
| `required: bool` | tous | `lib/spec.ts:112` |
| `min` / `max` | number/integer/decimal | `lib/spec.ts:113` |
| `minLength` / `maxLength` | string/text | `lib/spec.ts:112` |
| `values: string[]` | **enum** (obligatoire) | `lib/spec.ts:159`, `:387` |
| `accept: string[]` | file/file[] | `lib/spec.ts:160` |
| `maxSize: "5MB"` | file/file[] | `lib/spec.ts:160` |
| `storage: "r2"\|"s3"\|"local"` | file/file[] | `lib/spec.ts:160` |

> Note : `FieldSchema` est `.passthrough()` (`lib/spec.ts:718`) — d'autres options
> par-type peuvent exister côté runtime. Le seul champ **garanti validé** est `type`.

### 1.4 Relations

**Deux niveaux distincts coexistent** :

- **Par ressource** (`resources[].relations[]`, camelCase, `lib/spec.ts:428`) :
  `{ type: "oneToOne"|"oneToMany"|"manyToOne"|"manyToMany", resource, field, onDelete?, through? }`
  — `onDelete` ∈ `Cascade|SetNull|Restrict|NoAction`.
- **Top-level** (`spec.relations[]`, kebab-case, `lib/spec.ts:440`) :
  `{ from, to, type: "one-to-one"|"one-to-many"|"many-to-one"|"many-to-many", field, through?, onDelete? }`
  — `onDelete` ∈ `cascade|set-null|restrict`.

Invariants (`validateSemanticRules`, `lib/spec.ts:883-919`) :

- `manyToMany` / `many-to-many` **exige `through`** (nom de table de jonction).
- La ressource cible (`resource` / `from` / `to`) **doit exister** dans `resources` ou être réservée (`User`, `RefreshToken`, `OAuthAccount`).
- Le champ FK (`field`) doit exister sur la source comme `string`/`uuid` (`lib/spec.ts:176`) ; défaut = `"id"` (`lib/spec.ts:503`).

### 1.5 `permissions[]` (RBAC déclaratif)

```jsonc
"permissions": [
  { "resource": "Order", "rules": [
    { "role": "user",  "actions": ["create","read","update"], "ownOnly": true },
    { "role": "admin", "actions": ["create","read","update","delete"] }
  ]}
]
```

- Actions légales : `create|read|update|delete` (`VALID_PERMISSION_ACTIONS`, `lib/spec.ts:603`).
- `ownOnly: true` **exige `auth.jwt.enabled = true`** et **interdit `role:"public"`** (`lib/spec.ts:937-944`).
- `permissions[].resource` doit pointer une ressource existante (`lib/spec.ts:932`).

### 1.6 `env[]` (variables d'environnement)

```jsonc
"env": [
  { "name": "JWT_SECRET", "required": true, "generate": true, "managedByCloud": true },
  { "name": "STRIPE_SECRET_KEY", "required": false, "description": "..." }
]
```
(`lib/spec.ts:139-142`, `:198-201`). Exploité par `lib/env-vars.ts`.

### 1.7 `features`

| Feature | Forme (réf. `lib/spec.ts:144-150`, `:627-654`) |
|---|---|
| `fileUpload` | `{ enabled, provider:"r2"\|"s3"\|"local", maxSizeMB, allowedTypes:[] }` — `provider` requis |
| `webhooks` | `{ outbound:string[] (events), inbound:string[] (sources Stripe/GitHub) }` |
| `search` | `{ enabled, fuzzy }` — cherche dans `resource.searchable[]` |
| `pagination` | `{ defaultLimit, maxLimit }` |
| `rateLimit` | `{ perKey:"1000/min", public:"60/min" }` |

### 1.8 `authFlows`

`{ passwordReset, refreshTokens, revocation, emailVerification }` (booléens, `lib/spec.ts:152`, `:1028-1031`).

### 1.9 Noms réservés (quand auth active)

`getReservedAuthResources` (`lib/spec.ts:777-797`) :

- JWT activé → **`User`, `RefreshToken`** sont gérés par le runtime → interdits comme ressources, mais **valides comme cibles de relation**.
- OAuth configuré → **`OAuthAccount`** réservé de même.

---

# ÉTAPE 2 — Catalogue complet des opérations atomiques

Convention : chaque opération est une **fonction pure**
`apply(spec, params) → { spec } | { error }`, **idempotente quand c'est
naturel**, ne touchant **que** sa cible, et passant ensuite par le **gate de
validation** (cf. §4.2). Les paramètres sont **typés Zod** (le schéma sert aussi
à générer la définition d'outil LLM).

Légende danger : 🟢 sûre · 🟡 vérifs requises · 🔴 destructive (cf. Étape 3).

### 2.1 Méta

| Opération | Paramètres | Modifie | Danger |
|---|---|---|---|
| `setApiName(name)` | `name: kebab` | `spec.name` | 🟢 |
| `setApiDescription(description)` | `description?` | `spec.description` | 🟢 |
| `setGlobalRateLimit(windowMs, max)` | nombres | `spec.rateLimit` | 🟢 |
| `clearGlobalRateLimit()` | — | supprime `spec.rateLimit` | 🟢 |

> `version` n'est **pas** une opération : toujours `"1.0"`.

### 2.2 Ressources

| Opération | Paramètres | Modifie | Danger |
|---|---|---|---|
| `addResource(name, fields?, opts?)` | `name`, `fields?` (≥1 si fourni), `description?`, `endpoints?`, `rbac?` | ajoute à `resources[]` | 🟡 (collision nom / réservé) |
| `removeResource(name)` | `name` | retire de `resources[]` | 🔴 (relations/perms/FK orphelins) |
| `renameResource(oldName, newName)` | 2 noms | renomme + **propage** vers relations & permissions | 🔴 |
| `setResourceDescription(name, description)` | | `resources[i].description` | 🟢 |
| `setResourceEndpoints(name, endpoints[])` | sous-ensemble CRUD | `resources[i].endpoints` | 🟡 (retirer `read` casse `?include`) |
| `setResourceRbac(name, rbac)` | `{read,write,delete}` | `resources[i].rbac` | 🟡 (rôles inexistants) |
| `setSearchableFields(name, fields[])` | noms de champs existants | `resources[i].searchable` | 🟡 |

### 2.3 Champs

| Opération | Paramètres | Modifie | Danger |
|---|---|---|---|
| `addField(resource, field, type, options?)` | `type ∈ VALID_FIELD_TYPES` ; `values` requis si enum | `resources[i].fields[field]` | 🟡 (`required:true` sur table peuplée) |
| `modifyFieldOptions(resource, field, options)` | merge partiel (min/max/length/required/accept/...) | options du champ | 🟡 |
| `setFieldType(resource, field, type, options?)` | nouveau type | `field.type` (+ options par-type) | 🔴 (migration de données / narrowing) |
| `setFieldRequired(resource, field, required)` | bool | `field.required` | 🟡 (passer à `true`) |
| `renameField(resource, oldName, newName)` | | clé du champ + **réfs** (searchable, relation.field, rbac) | 🔴 |
| `removeField(resource, field)` | | retire le champ | 🔴 (FK de relation, searchable) |
| `addEnumValue(resource, field, value)` | | `field.values[]` (append) | 🟢 |
| `removeEnumValue(resource, field, value)` | | `field.values[]` | 🔴 (valeurs en base) |
| `setEnumValues(resource, field, values[])` | | remplace `field.values` | 🔴 |

### 2.4 Relations

Top-level **et** par-ressource sont gérées séparément (formats différents).

| Opération | Paramètres | Modifie | Danger |
|---|---|---|---|
| `addRelation(from, to, type, field?, opts?)` | `type` kebab ; `through` requis si N-N ; `field` défaut `"id"` | `spec.relations[]` | 🟡 |
| `removeRelation(from, to, type?)` | | retire la/les relation(s) correspondantes | 🟡 (champ FK laissé) |
| `setRelationOnDelete(from, to, onDelete)` | `cascade\|set-null\|restrict` | `relation.onDelete` | 🟢 |
| `addResourceRelation(resource, target, type, field, opts?)` | `type` camelCase ; `onDelete?` | `resources[i].relations[]` | 🟡 |
| `removeResourceRelation(resource, target, type?)` | | retire la relation par-ressource | 🟡 |

> Helper recommandé (non atomique, mais courant) : `linkResourcesOwnership(child, "User")`
> = `addField(child,"userId","uuid",{required:true})` + `addResourceRelation(child,"User","manyToOne","userId",{onDelete:"Cascade"})`
> + `setPermissionRule(child,"user",[...],ownOnly:true)`. Exécuté comme **séquence
> atomique** (tout ou rien), pas comme une seule opération.

### 2.5 Auth

| Opération | Paramètres | Modifie | Danger |
|---|---|---|---|
| `enableJwt(opts?)` | `secretEnv?, accessTokenTTL?, refreshTokenTTL?` | crée/active `auth.jwt`, ajoute `"jwt"` à `strategies` | 🟡 (réserve `User`/`RefreshToken`) |
| `disableJwt()` | — | retire `auth.jwt` & `"jwt"` | 🔴 (casse `ownOnly`, OAuth, relations→User) |
| `enableApiKey(opts?)` | `header?, prefix?` | `auth.apikey = {enabled:true,...}` | 🟢 |
| `disableApiKey()` | — | retire `auth.apikey` | 🟡 |
| `addOAuthProvider(name, opts?)` | `name ∈ google\|github\|apple` | `auth.oauth.providers[]` | 🟡 (**exige JWT** ; réserve `OAuthAccount`) |
| `removeOAuthProvider(name)` | | retire le provider | 🟡 |
| `setAuthFlag(flag, value)` | `flag ∈ emailVerification\|passwordReset` | `auth.<flag>` | 🟢 |
| `disableAuth()` | — | supprime tout le bloc `auth` | 🔴 (casse rbac/permissions/relations→User) |

> Forme légacy : `setLegacyAuthStrategy(strategy)` (`jwt|apikey|bearer`) pour les
> specs simples — mais préférer la forme moderne dès qu'il y a ≥2 stratégies/OAuth.

### 2.6 Rôles & permissions

| Opération | Paramètres | Modifie | Danger |
|---|---|---|---|
| `addRole(name)` | | `spec.roles[]` | 🟢 |
| `removeRole(name)` | | retire du `roles[]` | 🔴 (réfs rbac/permissions) |
| `renameRole(oldName, newName)` | | renomme + **propage** (rbac, permissions.rules.role) | 🔴 |
| `setPermissionRule(resource, role, actions[], ownOnly?)` | | upsert d'une règle dans `permissions[]` | 🟡 (`ownOnly` exige JWT) |
| `removePermissionRule(resource, role)` | | retire une règle | 🟡 |
| `removeResourcePermissions(resource)` | | retire l'entrée `permissions[]` | 🟡 |

### 2.7 Features

| Opération | Paramètres | Modifie | Danger |
|---|---|---|---|
| `enableFileUpload(provider, opts?)` | `provider ∈ r2\|s3\|local` ; `maxSizeMB?, allowedTypes?` | `features.fileUpload` | 🟡 (env du provider) |
| `disableFileUpload()` | — | retire `features.fileUpload` | 🟡 (champs `file` orphelins) |
| `addOutboundWebhook(event)` | `"order.created"` | `features.webhooks.outbound[]` | 🟢 |
| `removeOutboundWebhook(event)` | | | 🟢 |
| `addInboundWebhook(source)` | `"stripe"` | `features.webhooks.inbound[]` | 🟡 (env du provider) |
| `removeInboundWebhook(source)` | | | 🟢 |
| `setSearch(enabled, fuzzy?)` | | `features.search` | 🟡 (besoin de `searchable[]`) |
| `setPagination(defaultLimit, maxLimit)` | | `features.pagination` | 🟢 |
| `setFeatureRateLimit(perKey?, public?)` | | `features.rateLimit` | 🟢 |

### 2.8 `authFlows`

| Opération | Paramètres | Modifie | Danger |
|---|---|---|---|
| `setAuthFlow(flow, value)` | `flow ∈ passwordReset\|refreshTokens\|revocation\|emailVerification` | `authFlows.<flow>` | 🟡 (certains exigent JWT) |

### 2.9 Variables d'environnement

| Opération | Paramètres | Modifie | Danger |
|---|---|---|---|
| `addEnvVar(name, opts?)` | `required?, generate?, managedByCloud?, description?` | `spec.env[]` | 🟢 |
| `modifyEnvVar(name, opts)` | merge | entrée `env[]` | 🟢 |
| `removeEnvVar(name)` | | | 🟡 (référencée par auth/features) |

### 2.10 Endpoints custom

| Opération | Paramètres | Modifie | Danger |
|---|---|---|---|
| `addCustomEndpoint(resource, definition)` | def (mobile money, etc.) | `resources[i].customEndpoints[]` | 🟡 |
| `removeCustomEndpoint(resource, id)` | | | 🟡 |

---

# ÉTAPE 3 — Opérations dangereuses & règles de sécurité

Trois familles de risque : **références orphelines**, **dépendances auth**,
**migration de données**. Pour chacune, la règle par défaut est :
**détecter → refuser OU exiger une décision explicite (cascade / confirmation)**,
jamais une suppression silencieuse.

### 3.1 `removeResource` 🔴

**Casse :** relations top-level dont `from`/`to` = la ressource ; relations
par-ressource (d'autres ressources) la ciblant ; `permissions[].resource` ;
champs FK pointant dessus ; entrées `searchable`.

**Règles :**
1. Calculer la liste des **références entrantes** (relations, permissions, FK).
2. Si références existantes → **refuser** par défaut, et retourner la liste à
   l'agent/utilisateur. Option `cascade:true` (après confirmation explicite)
   qui supprime aussi relations + permissions liées (mais **pas** les champs FK
   des autres ressources sans confirmation séparée — un FK orphelin reste un
   `uuid` valide, donc moins dangereux).
3. **Interdire** la suppression d'une ressource réservée (n'existe pas dans
   `resources[]` de toute façon).

### 3.2 `renameResource` 🔴

**Casse :** toute référence par **nom** : `relations.from/to`, `relations[].resource`
(par-ressource), `permissions[].resource`, `through` (si nommé d'après la ressource).

**Règles :**
1. **Propagation atomique** : renommer la ressource *et* toutes ses références
   dans la même transaction. Un rename qui ne propage pas est interdit.
2. Vérifier que `newName` n'entre pas en collision (ressource existante ou nom
   réservé sous l'auth courante).
3. Ne **pas** renommer automatiquement les champs FK (`userId` ne devient pas
   `customerId`) — c'est un `renameField` séparé, optionnel, à proposer.

### 3.3 `removeField` / `renameField` 🔴

**Casse :** champ utilisé comme `relation.field` (FK) ; présent dans
`searchable[]` ; référencé par une règle `ownOnly` (`userId`).

**Règles :**
- `removeField` : refuser si le champ est le `field` d'une relation
  → demander de retirer la relation d'abord (ou cascade explicite). Sinon,
  retirer aussi l'entrée `searchable` correspondante.
- `renameField` : propager vers `relation.field`, `searchable[]`. Garde-fou
  spécial pour `userId` lié à `ownOnly` (cf. pattern runtime `userId = identité`,
  `lib/spec.ts:188-196`) : prévenir que le runtime attend `userId`.

### 3.4 `setFieldType` / `setEnumValues` / `removeEnumValue` 🔴

**Casse :** migration de schéma Prisma côté runtime ; **narrowing** (text→integer,
suppression de valeurs enum présentes en base).

**Règles :**
1. Classer les transitions : **élargissantes** (integer→string, ajout d'enum) =
   🟡 ; **rétrécissantes** (string→integer, decimal→integer, retrait d'enum) = 🔴.
2. Pour une transition 🔴 sur une API **déjà déployée** (Job déployé) → exiger
   confirmation explicite + signaler le risque de migration destructive.
3. `enum` sans `values` → toujours refusé (`lib/spec.ts:159`).

### 3.5 `disableJwt` / `disableAuth` 🔴

**Casse :** règles `ownOnly` (exigent JWT, `lib/spec.ts:941`) ; providers OAuth
(exigent JWT, `lib/spec.ts:951`) ; relations vers `User`/`RefreshToken`
(deviennent des cibles inconnues, `lib/spec.ts:896`).

**Règles :**
1. Précalculer les dépendances : si des `ownOnly`, des providers OAuth ou des
   relations→`User` existent → **refuser** tant qu'elles ne sont pas retirées,
   et lister précisément ce qui bloque.
2. Offrir un plan en cascade (retirer OAuth → retirer `ownOnly` → retirer
   relations→User → `disableJwt`) à confirmer pas à pas.

### 3.6 `addOAuthProvider` 🟡 / `removeRole` 🔴

- `addOAuthProvider` : **exiger `auth.jwt.enabled`** (sinon proposer `enableJwt`
  d'abord) ; provider ∈ `google|github|apple` (`lib/spec.ts:524`) ; déclarer
  les env `*_CLIENT_ID/SECRET` (cohérence avec `normalizeOAuthProvider`).
- `removeRole` : refuser si le rôle est référencé dans un `rbac` ou une règle de
  permission → demander de nettoyer ces références d'abord (ou cascade).

### 3.7 `addResource` / `addRelation` 🟡

- `addResource` : refuser un **nom réservé** sous l'auth courante (`User`,
  `RefreshToken`, `OAuthAccount`) et toute **collision** ; PascalCase.
- `addRelation` : cible doit exister (ou réservée) ; `manyToMany` ⇒ `through`
  obligatoire ; `field` doit exister sur la source comme `string`/`uuid` (sinon
  proposer un `addField` du FK).

### 3.8 Invariant transversal — le **gate de validation**

> **Aucune** opération ne « valide elle-même » sa sortie de façon ad hoc. Après
> mutation, le résultat passe **systématiquement** par le pipeline existant
> (`normalizeSpecCandidate` → `validateSpecCandidate` → `parseSpec`, `lib/spec.ts:989`)
> appliqué à l'**objet** (pas au texte). Si le gate échoue → **rollback total**
> (l'opération est rejetée, la spec d'origine est conservée) et l'erreur
> française est renvoyée à l'agent comme résultat d'outil.

Cela garantit que les règles sémantiques (`validateSemanticRules`) restent
**l'unique source de vérité** : pas de duplication de logique de validation dans
chaque opération. Les pré-checks par opération (§3.1-3.7) servent à produire des
**messages d'erreur exploitables** et à éviter des cascades surprises — pas à
remplacer le gate.

---

# ÉTAPE 4 — Recommandation d'implémentation

### 4.1 Tool calling : Vercel AI SDK (recommandé) vs router maison

État actuel : `routeLLM` (`lib/llm-router.ts`) est un routeur multi-provider
maison (Anthropic/Mistral/Gemini/Groq) avec **clés et matrice de routage en DB**,
mais **sans support de tool calling** (uniquement `generate` texte/JSON +
`stream`). Le Vercel AI SDK **n'est pas installé** ; l'Anthropic SDK `0.32.1`
(tools natifs) et le Mistral SDK le sont.

| Option | Avantages | Inconvénients |
|---|---|---|
| **A. Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`, `@ai-sdk/mistral`, …) | Boucle multi-step (`maxSteps`) gérée ; `tools` provider-agnostique ; streaming natif Next.js ; schémas Zod directement comme `parameters` | Nouvelle dépendance ; doit réutiliser les clés/routage DB existants |
| B. Étendre `routeLLM` avec un canal `tools` | Garde le routage/keys/AgentLog maison | Réimplémenter la boucle tool-use **par provider** (Anthropic ≠ Mistral) ; bug-prone |

**Recommandation : Option A, en réutilisant la résolution de clés/routage
existante.** Câbler les providers AI SDK avec les clés déchiffrées par
`loadResolvedProviders()` et l'ordre de `loadResolvedRouting()`, de sorte que la
gouvernance (plans, fallback, AgentLog) reste centralisée. Le SDK n'apporte que
la **boucle de tool calling** ; il ne devient pas un second système de routage.

> Détail clé : avec l'AI SDK, les `tools` exposent un `parameters` Zod **et** une
> closure `execute` — mais ici `execute` ne fait qu'appeler l'**exécuteur
> d'opérations** (§4.2). Le LLM ne voit jamais la spec écrite ; il ne reçoit en
> retour qu'un **diff + statut de validation**.

### 4.2 Architecture du moteur d'opérations (le cœur, côté code)

```
lib/operations/
  registry.ts        // Map<opName, OperationDef>
  types.ts           // OperationDef = { name, description, params: ZodSchema,
                     //                  danger: 'safe'|'guarded'|'destructive',
                     //                  apply(spec, params) => Result }
  resources.ts       // addResource, removeResource, renameResource, ...
  fields.ts          // addField, setFieldType, renameField, ...
  relations.ts       // addRelation, addResourceRelation, ...
  auth.ts            // enableJwt, addOAuthProvider, disableAuth, ...
  permissions.ts roles.ts features.ts env.ts
  executor.ts        // applyOperation(spec, op) : clone → apply → GATE → diff
  diff.ts            // diff structuré entre deux specs (pour l'UI/confirmation)
```

Contrats :

- **Pure & immuable** : `apply` clone la spec (structuredClone), mute la copie,
  ne touche jamais l'original.
- **Gate centralisé** : `executor.applyOperation` enchaîne
  `apply → normalizeSpecCandidate → validateSpecCandidate → parseSpec`. Échec ⇒
  `{ ok:false, error }` **sans** mutation publiée.
- **Transactionnel multi-op** : une requête utilisateur peut produire N appels
  d'outils. Les appliquer **séquentiellement sur une spec de travail**, ne
  **committer** (créer une révision, §4.3) qu'à la fin si **tout** valide ;
  sinon rollback complet. (Les helpers comme `linkResourcesOwnership` sont juste
  des séquences pré-câblées dans cette transaction.)
- **Tool definitions auto-générées** : chaque `OperationDef.params` (Zod) est
  converti en JSON Schema (`zod` est déjà une dépendance ; `zod-to-json-schema`
  ou l'intégration native AI SDK) pour produire la liste d'outils envoyée au LLM.
  Une seule source de vérité par opération.
- **Garde-fous destructifs** : les opérations `destructive` exigent un flag
  `confirmed:true` dans leurs params (faute de quoi `apply` renvoie un
  `requiresConfirmation` avec l'impact calculé) → l'agent rappelle l'utilisateur
  via une question avant de réémettre l'appel.

### 4.3 Stockage de la spec & historique (undo/redo)

Existant : `Job.spec` et `Conversation.spec` sont des `Json?` **uniques**
(`prisma/schema.prisma`) — **aucun historique**.

**Recommandation — nouvelle table append-only `SpecRevision`** :

```prisma
model SpecRevision {
  id               String   @id @default(cuid())
  jobId            String?
  conversationId   String?
  seq              Int      // monotone par job/conversation (1,2,3…)
  spec             Json     // SNAPSHOT complet (specs petites → simple & sûr)
  operations       Json     // [{ name, params }] appliquées vs le parent (audit)
  parentRevisionId String?  // chaînage pour undo/redo
  label            String?  // ex. "Ajout résiliation abonnement"
  authoredBy       String   // userId
  createdAt        DateTime @default(now())

  @@index([jobId, seq])
  @@index([conversationId, seq])
}
```

Choix **snapshot + log d'opérations (hybride)** :

- **Snapshot complet** par révision → undo/redo trivial et **toujours valide**
  (on restaure un état déjà passé par le gate). Les specs font quelques Ko :
  le coût de stockage est négligeable, et c'est bien plus robuste qu'un système
  d'inverses d'opérations à maintenir.
- **Liste d'opérations** conservée pour l'**audit/explicabilité** (« qu'a fait
  l'agent ? »), pas pour le replay.

Mécanique :

- `Job.spec` / `Conversation.spec` restent le **pointeur « courant »**
  (dénormalisé) → le runtime, la régénération et l'UI continuent de fonctionner
  **sans changement**.
- **Commit** : après une transaction multi-op réussie → créer une `SpecRevision`
  (seq+1, parent = révision courante, snapshot + ops) et mettre à jour le
  pointeur courant.
- **Undo** : pointer vers `parentRevisionId`. **Redo** : suivre l'enfant le plus
  récent. (Brancher en avant après un undo = nouvelle branche ; on garde le
  modèle simple « dernier enfant ».)

### 4.4 Découplage édition ↔ régénération de code

Point essentiel vs l'existant : **modifier la spec ne déclenche PLUS** un appel
LLM de régénération (`buildModificationSystemPrompt` est retiré du chemin
critique). Les éditions s'**accumulent** sur la spec (révisions successives,
validées par le gate). La **génération de code** (Trigger.dev → worker →
runtime → ZIP, cf. AGENTS.md) reste déclenchée **uniquement** par une action
explicite « déployer / régénérer », qui consomme la **révision courante**. Le
LLM n'intervient que pour **traduire la demande en appels d'outils**, jamais
pour produire la spec ni le code.

### 4.5 Migration depuis l'existant

1. Garder `safeParseSpec`/`validateSpecCandidate`/`parseSpec` tels quels (le gate
   les réutilise sur objet).
2. Introduire `lib/operations/*` + l'exécuteur (fonctions pures, testables sans
   LLM — les tests `scripts/test-spec-*.ts` servent de base de fixtures).
3. Brancher l'agent (AI SDK) sur l'endpoint de modification ; remplacer le prompt
   « régénère toute la spec » par un prompt « choisis des opérations » + le
   **résumé** de la spec courante (pas le JSON brut complet quand c'est gros).
4. Ajouter `SpecRevision` + pointeur courant ; activer undo/redo dans l'UI.

---

## Annexe — Référence rapide des contraintes validées

| Contrainte | Réf. `lib/spec.ts` |
|---|---|
| Types de champ légaux (15) | `VALID_FIELD_TYPES` `:284` |
| Stratégies auth (`jwt|apikey|bearer`) | `VALID_AUTH_STRATEGIES` `:302` |
| Providers OAuth (`google|github|apple`) | `VALID_OAUTH_PROVIDERS` `:524` |
| Endpoints CRUD (`list|create|read|update|delete`) | `ALLOWED_CRUD` `:415` |
| Actions perms (`create|read|update|delete`) | `VALID_PERMISSION_ACTIONS` `:603` |
| Storage (`s3|r2|local`) | `VALID_STORAGE_PROVIDERS` `:625` |
| Relations par-ressource (camelCase) | `:428` |
| Relations top-level (kebab-case) | `:440` |
| `manyToMany` ⇒ `through` | `:899`, `:916` |
| `ownOnly` ⇒ JWT, ≠ public | `:937-944` |
| OAuth ⇒ JWT | `:951` |
| Noms réservés (`User`/`RefreshToken`/`OAuthAccount`) | `:777-797` |
| Pipeline de validation | `safeParseSpec` `:989` |
</content>
</invoke>
