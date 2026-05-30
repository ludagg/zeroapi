# SYNC_AUDIT — Synchronisation plateforme ↔ runtime `@ludagg/zeroapi-runtime`

> Audit demandé : la plateforme est-elle synchronisée avec la dernière structure
> de spec du runtime (0.20.0) ? **Analyse uniquement — aucun code modifié.**
> Date : 2026-05-30 · Branche : `claude/runtime-spec-sync-audit-YwQzI`

## TL;DR

**Non, la plateforme est en retard de 6 releases.** Elle est figée sur le runtime
`0.16.5` alors que `npm` publie déjà `0.20.0`. Les trois grandes nouveautés de
spec citées (scope RBAC multi-tenant, state machines, agrégats déclaratifs) ont
été ajoutées **après** la version utilisée par la plateforme — elle ne peut donc
ni les générer, ni les manipuler, ni les valider.

| Capacité runtime 0.20.0 | Introduite en | Connue de la plateforme (0.16.5) ? |
|---|---|---|
| Persistance Prisma, transactions ACID, relations/M2M | ≤ 0.16.5 | ⚠️ Type présent, **mais non exploité** par l'UI/ops/prompt |
| `PermissionRule.scope` (RBAC multi-tenant) | **0.18.0** | ❌ Inconnu |
| `ResourceDefinition.stateMachine` | **0.19.0** | ❌ Inconnu |
| `ResourceDefinition.aggregates` | **0.20.0** | ❌ Inconnu |

---

## 1. VERSION

**La plateforme utilise `^0.16.5`, PAS `0.20.0`.**

- `package.json:30` → `"@ludagg/zeroapi-runtime": "^0.16.5"`
- `pnpm-lock.yaml` → résolu en `0.16.5` (une seule version dans le lockfile)
- `workers/zip-bundle.ts:52` → le `package.json` **généré pour les projets clients**
  fige aussi `"@ludagg/zeroapi-runtime": "^0.16.5"` → les API déployées tournent
  donc elles aussi sur 0.16.5.

Versions publiées sur npm (`npm view`) : `… 0.16.5, 0.17.0, 0.17.1, 0.17.2,
0.18.0, 0.19.0, 0.20.0`. **`latest = 0.20.0`.** La plateforme est **6 minor
releases en retard**.

Historique git des bumps (`git log`) : la dernière montée de version est
`fc2588a chore: bump … to ^0.16.5` (PR #56). Aucun commit ne touche 0.17 → 0.20.

---

## 2. STRUCTURE DE SPEC

La plateforme a bien sa **propre couche** autour de la spec : `lib/spec.ts`
(1039 lignes). Mais elle **ne redéfinit pas** le type : elle le **ré-exporte** du
runtime et délègue la validation stricte à `parseSpec()` :

- `lib/spec.ts:2` → `import { parseSpec, ParseError, type ZeroAPISpec } from "@ludagg/zeroapi-runtime"`
- `lib/spec.ts:4-5` → `export type { ZeroAPISpec }; export { parseSpec, ParseError };`
- `lib/spec.ts:1017` → `safeParseSpec()` finit toujours par `return parseSpec(normalized)`

Conséquence : **le `ZeroAPISpec` que la plateforme connaît EST celui de 0.16.5.**
Or le type top-level `ZeroAPISpec` est **identique** entre 0.16.5 et 0.20.0 — tout
le delta est dans les sous-types imbriqués (`ResourceDefinition`, `PermissionRule`).
Comme `parseSpec` de 0.16.5 ignore/strip les champs qu'il ne connaît pas, la
plateforme **rejetterait ou tronquerait silencieusement** une spec 0.20.0.

En plus du type runtime, `lib/spec.ts` porte une **pré-validation maison** (Zod +
messages FR) et une **normalisation** des sorties LLM. Ces couches énumèrent
explicitement les champs supportés — et **n'en connaissent que l'ancienne
structure** :

- Types de champ : `VALID_FIELD_TYPES` (`lib/spec.ts:284-300`) — aucun champ lié à
  un état/agrégat.
- Auth : legacy `strategy` + moderne `jwt/apikey/oauth` (`lib/spec.ts:552-601`).
- Relations : per-resource + top-level (`lib/spec.ts:427-507`).
- Permissions : `role/actions/ownOnly` uniquement (`lib/spec.ts:603-623`,
  `validateSemanticRules` `:931-946`). **Pas de `scope`.**
- Features : `fileUpload/webhooks/search/pagination/rateLimit` (`lib/spec.ts:627-654`).

→ **Connaît-elle `scope` / `stateMachine` / `aggregates` ?** **Non.**
  `grep` sur tout `lib/ app/ components/` : zéro occurrence réelle. Les seuls hits
  sont des faux positifs (`scopes` OAuth, `AggregatedEnvVar` pour les variables
  d'env, un commentaire « transitions » dans `lib/operations/fields.ts:29`).

→ **Elle ne connaît que l'ancienne structure** : `resources`, `fields`,
  `relations`, `permissions` (ownOnly), `env`, `features`, `auth`, `roles`,
  `authFlows`.

---

## 3. LE MOTEUR D'OPÉRATIONS (`lib/operations/`)

**Existe et est mergé dans `main`.** PR #57 (`75fe4f5 feat(operations): moteur
d'opérations atomiques de spec`), conçu dans `OPERATIONS.md`. 16 fichiers,
surface publique dans `lib/operations/index.ts`.

**Décompte exact : 55 opérations** (`OPERATION_COUNT`, `lib/operations/registry.ts:161` ;
55 interfaces `…Op` dans `lib/operations/types.ts`, 55 entrées dans
`OPERATION_DANGER` `registry.ts:102-158`). Le « ~55 » de la demande est exact.

**Créé AVANT ou APRÈS les nouvelles features du runtime ?**
- Le moteur (PR #57) a été mergé **juste après** le bump 0.16.5 (PR #56,
  `4d1a319`). `git log -- lib/operations/` → premier commit `75fe4f5`.
- Il a donc été écrit **contre 0.16.5**, c.-à-d. **AVANT** 0.18 (scope), 0.19
  (stateMachine) et 0.20 (aggregates). Ces features n'existaient pas encore.

**Couvre-t-il scope / stateMachine / aggregates ?** **Non — aucune opération.**
Les 8 familles d'`Operation` (`types.ts:226-253`) sont : meta, resources, fields,
relations, auth, roles & permissions, features, authFlows, env, customEndpoints.

- `SetPermissionRuleOp` (`types.ts:174-180`) n'expose que `role/actions/ownOnly`
  → **pas de `scope`**.
- Aucun `setStateMachine` / `addTransition`.
- Aucun `addAggregate`.
- **Bonus à noter** : même les champs présents *dès 0.16.5* ne sont pas couverts
  par le moteur — **aucune opération** pour `transactions`, `softDelete`,
  `timestamps` (`grep` sur `lib/operations/` = 0). Ce sont des angles morts
  préexistants, indépendants du retard de version.

→ Le moteur couvre **uniquement les anciennes features**.

---

## 4. GÉNÉRATION (prompt → spec)

La génération passe par `SPEC_SYSTEM_PROMPT` (`lib/spec.ts:82-222`), envoyé par
`lib/spec-generation.ts:42`, puis `safeParseSpec` (normalise → valide FR →
`parseSpec` 0.16.5).

**La spec générée est une spec « 0.15/0.16 », pas 0.20.0.** Le prompt s'annonce
lui-même comme tel : `lib/spec.ts:82` → « *validée par `parseSpec()` … v0.15* ».
La « SHAPE EXACTE » documentée (`:85-153`) liste auth, roles, resources, fields,
relations, permissions(ownOnly), env, features, authFlows — **et rien d'autre**.
Le prompt dit même « *tout écart sera rejeté* » (`:85`), donc le LLM est
activement dissuadé d'émettre `scope`/`stateMachine`/`aggregates`.

Conséquence pour un déploiement sur runtime récent :
- Une spec générée **fonctionnera** sur 0.20.0 (rétro-compatible : le top-level
  `ZeroAPISpec` est inchangé).
- Mais elle **n'exploitera jamais** les capacités 0.18–0.20 : pas d'isolation
  multi-tenant, pas de machine à états, pas d'agrégats. Le runtime récent serait
  **sous-utilisé**.
- Et si un utilisateur demandait explicitement du multi-tenant, la couche de
  normalisation/validation (`validateSpecCandidate`) **rejetterait** ou
  **stripperait** le champ `scope` avant même d'atteindre le runtime.

---

## 5. DÉSYNCHRONISATIONS (écarts runtime 0.20.0 ↔ plateforme)

Référence runtime : type defs de `@ludagg/zeroapi-runtime@0.20.0`
(`dist/index.d.ts`).

### A. Écarts dus au retard de version (0.17 → 0.20)

1. **RBAC multi-tenant `PermissionRule.scope`** — *introduit en 0.18.0*.
   Runtime : `interface PermissionScope { column: string; claim?: string }`,
   `PermissionRule.scope?` (généralise `ownOnly` : filtre les lignes sur
   `column == claim JWT`, force la valeur en création, rejette hors-scope en
   update/delete).
   Plateforme : inconnu. `SetPermissionRuleOp` n'a pas `scope` ; `SPEC_SYSTEM_PROMPT`
   et `validateSemanticRules` ne gèrent que `ownOnly`.

2. **State machines `ResourceDefinition.stateMachine`** — *introduit en 0.19.0*.
   Runtime : `StateMachineDef { field; initial; transitions: StateTransition[] }`,
   transitions `from→to` optionnellement gardées par rôles, hors-liste rejeté (409).
   Plateforme : inconnu. Aucun type, prompt ou opération.

3. **Agrégats déclaratifs `ResourceDefinition.aggregates`** — *introduit en 0.20.0*.
   Runtime : `AggregateDef { name; op: count|sum|avg|min|max; relation; field? }`,
   exposés via `?include=<name>`.
   Plateforme : inconnu. Aucun type, prompt ou opération.

### B. Écarts préexistants (capacités déjà dans 0.16.5, non câblées)

Ces champs existent **déjà** dans le `ZeroAPISpec` 0.16.5 que la plateforme
importe, mais ni le prompt de génération, ni le moteur d'opérations, ni l'UI ne
les exposent :

4. **`ResourceDefinition.transactions`** (`TransactionConfig[]` — transactions
   ACID multi-opérations). Présent dès 0.16.5 (`dist/index.d.ts`), runtime
   exporte `executeTransaction`. Plateforme : 0 occurrence dans `lib/operations/`
   et `lib/spec.ts`.
5. **`ResourceDefinition.softDelete`** — aucune génération ni opération.
6. **`ResourceDefinition.timestamps`** — aucune génération ni opération.
7. **`ResourceDefinition.hooks` / `auth` par ressource** — non exposés.

> Note relations/M2M « profondes » : le top-level `ZeroAPISpec` et
> `ResourceDefinition.relations` sont **structurellement identiques** entre 0.16.5
> et 0.20.0. Les améliorations de relations/M2M de 0.17.x sont surtout du
> **comportement runtime** (includes imbriqués, génération Prisma), pas de
> nouveaux champs de spec — la plateforme génère donc une forme valide, mais
> bénéficierait de la mise à jour pour le comportement.

---

## Ce qui est synchronisé / en retard / à mettre à jour

### ✅ Synchronisé
- Le **socle de spec** (auth, roles, resources, fields, relations top-level &
  per-resource, permissions `ownOnly`, env, features, authFlows) : aligné, car le
  top-level `ZeroAPISpec` n'a pas bougé depuis 0.16.5.
- Le **pipeline de parsing** délègue à `parseSpec()` du runtime → pas de schéma
  divergent maison à maintenir séparément.
- Le **moteur d'opérations** (55 ops) est mergé, exhaustif et type-safe **pour le
  périmètre 0.16.5**.

### ⏳ En retard
- **Version** : 0.16.5 vs 0.20.0 (6 releases).
- **`scope` (0.18)**, **`stateMachine` (0.19)**, **`aggregates` (0.20)** :
  inconnus de bout en bout (prompt, normalisation, validation, opérations, UI).
- **`transactions` / `softDelete` / `timestamps`** : disponibles dès 0.16.5 mais
  jamais câblés.

### 🔧 À mettre à jour AVANT de construire l'agent
1. **Bumper le runtime** vers `^0.20.0` dans `package.json:30` **et**
   `workers/zip-bundle.ts:52` (sinon les API générées resteraient en 0.16.5),
   puis `pnpm install` + `pnpm typecheck` pour voir les ruptures de types.
2. **Étendre `SPEC_SYSTEM_PROMPT`** (`lib/spec.ts:82-222`) : documenter `scope`,
   `stateMachine`, `aggregates` (+ `transactions/softDelete/timestamps`) dans la
   « SHAPE EXACTE », sinon le LLM continuera de produire de l'ancien.
3. **Étendre la normalisation/validation maison** (`normalizeSpecCandidate`,
   `validateSpecCandidate`, `validateSemanticRules`, `lib/spec.ts:603-977`) :
   reconnaître/valider les nouveaux champs au lieu de les stripper, et y porter
   les invariants runtime (ex. `scope` exige JWT ; `stateMachine.field` doit être
   un `enum` ; `aggregate.relation` doit être une relation to-many existante).
4. **Ajouter les opérations manquantes** au moteur (`lib/operations/types.ts` +
   `registry.ts` + nouveaux modules) : `setPermissionScope`, `setStateMachine` /
   `addTransition` / `removeTransition`, `addAggregate` / `removeAggregate`, et
   idéalement `setSoftDelete` / `setTimestamps` / opérations `transactions`. Le
   `switch` exhaustif (`registry.ts:25`) garantit une erreur de compilation tant
   qu'une variante n'est pas câblée — bon garde-fou.
5. **UI** (`components/conversations/spec-sidebar.tsx`,
   `components/api-detail/*`) : afficher les nouveaux blocs.
6. **Mettre à jour `OPERATIONS.md`** (le « ~55 » deviendra plus élevé) et le
   `countEndpoints` (`lib/spec.ts:1021`) si les agrégats/state-machine ajoutent
   des endpoints.

**Recommandation** : faire les points 1→4 **avant** de brancher l'agent, sinon
l'agent générera/éditera des specs qui n'exploitent pas le runtime 0.20.0 et
pourrait même produire des champs rejetés par la couche de validation maison.
