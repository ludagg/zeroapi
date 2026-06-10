# ROADMAP — ZeroAPI

> Plan de développement pour la suite, établi après audit complet du code.
> Date : 10 juin 2026 · Statut produit : **beta publique, cœur fonctionnel**

---

## 1. Où en est le produit (état réel)

Le produit dépasse largement la roadmap initiale d'`AGENTS.md`. Le cœur est
**opérationnel de bout en bout** : description en langage naturel → spec validée
→ génération de code (Prisma + Hono + tests + OpenAPI) → ZIP sur R2 →
déploiement réel sur ZeroAPI Cloud (Coolify).

### ✅ Solide / prêt pour la production

| Domaine | État | Détail |
|---|---|---|
| Pipeline de génération | ✅ | `spec-generation` (retry + JSON repair) → `runtime-worker` → ZIP → R2 |
| Routage LLM multi-provider | ✅ | Anthropic / Mistral / Gemini / Groq, fallback + cache, routage par plan |
| Agent KIA (édition live) | ✅ | 66+ opérations typées, tool-calling, pas de réécriture de spec |
| Moteur d'opérations | ✅ | `lib/operations/*` (~2500 LOC), gate transactionnel, rollback atomique |
| Éditeur graphe spatial | ✅ | Création/édition ressources, champs, relations, réglages globaux |
| Undo/redo + versions | ✅ | Snapshots `specHistory` / `specVersion` |
| Conversation temps réel | ✅ | Streaming NDJSON, questions de cadrage avant build |
| Déploiement ZeroAPI Cloud | ✅ | Coolify v4 : Postgres + Docker app + domaine + env + poll de build |
| Auth | ✅ | Better Auth (email/pass + Google + GitHub), reset, vérif email |
| Admin | ✅ | Users, jobs, routage LLM, providers, monitoring sécurité, alertes Telegram |
| Marketplace templates | ✅ | Publication PUBLIC/PRIVÉ depuis un job, templates officiels |
| Partage public | ✅ | Liens lecture-seule d'une spec (`/s/[slug]`) |
| Mode Audit | ✅ | Score d'architecture + corrections en 1 clic |
| i18n FR/EN | ✅ | next-intl sur tout le produit |
| Dev Mode | ✅ | OpenAPI / SDK / cURL / exports depuis la spec en direct |
| Tests cœur logique | ✅ | 8 scripts (KIA, opérations, pipeline, crypto, env, graph…) |

### 🟡 Partiel / factice

| Domaine | Manque |
|---|---|
| **Métriques produit** | KPIs dashboard (requêtes 24h, coût, p99) = valeurs **déterministes factices** (`lib/db-tables.ts`, `liveStatsFor`) |
| **Feature Databases** | Suivi uniquement — pas de requête réelle sur les Postgres déployés, pas de navigateur de données |
| **Domaines custom** | Sous-domaine `api-{slug}.zeroapi.app` seulement, pas de CNAME |
| **Équipe / collaboration** | `TeamMember` existe mais peu exploité ; pas de RBAC plateforme ni d'édition collaborative |

### ❌ Absent

| Domaine | Impact |
|---|---|
| **Monétisation (paiement)** | **Bloquant business** — plans + prix EUR définis (`lib/plans.ts`) mais aucune intégration Stripe/checkout. Impossible de payer/upgrade. |
| **CI qualité** | Un seul workflow (`trigger-deploy.yml`). Pas de gate typecheck/lint/tests sur les PR. |
| Déploiement Railway / Render / Vercel / Fly | Enums présents, générateurs de config présents, mais **aucune route ni client** — uniquement Coolify |
| Export vers dépôt GitHub | Pas de « push to GitHub » / déploiement 1-clic externe |
| GraphQL / autres styles d'API | REST/Hono uniquement |

### 🧹 Dette / nettoyage immédiat

- **PR #2** (postinstall prisma generate) — **obsolète**, le hook est déjà dans
  `package.json:11`. À fermer.
- **PR #72** (UI/UX foundations + primitives partagées) — ouverte depuis le
  1er juin, encore pertinente (Button, StatusPill, Card, EmptyState…). À
  rebaser/relancer ou cherry-pick, sinon fermer pour éviter la divergence.
- `AGENTS.md` décrit un schéma DB et une arbo périmés (ex. `auth.type`,
  écrans `/generate`). À réaligner sur la réalité (le flow est `/conversations`).

---

## 2. Principe directeur

Le **moteur** est mûr. La prochaine étape n'est plus « générer mieux » mais
**transformer un cœur technique en SaaS exploitable** : encaisser de l'argent,
mesurer l'usage réel, et fiabiliser la livraison. On priorise donc la valeur
business et la confiance avant les nouvelles features de génération.

---

## 3. Plan par phases

### 🟥 Phase 1 — Monétisation & fiabilité (priorité absolue)

Objectif : pouvoir **facturer** et **ne pas régresser**.

1. **Intégration paiement (Stripe)** — *le chantier #1*
   - Modèle `Subscription` (Prisma) lié à `User` : `stripeCustomerId`,
     `stripeSubscriptionId`, `status`, `currentPeriodEnd`, `plan`.
   - Checkout Stripe pour STARTER/PRO/BUSINESS (prix de `lib/plans.ts`).
   - Webhook `/api/stripe/webhook` : `checkout.session.completed`,
     `customer.subscription.updated/deleted` → met à jour `plan` +
     `generationsLimit` + reset mensuel de `generationsUsed`.
   - Portail client Stripe (gérer/annuler l'abonnement).
   - Brancher la page `settings` / le bouton « Passer Business » déjà prévu.
   - Garde-fous : le gating existe déjà (FREE/STARTER bloqués sur le déploiement
     Cloud, compteur de générations) — il suffit de le relier au vrai abonnement.

2. **CI de qualité** (GitHub Actions)
   - Workflow `ci.yml` sur chaque PR : `pnpm install` → `prisma generate` →
     `pnpm typecheck` → `pnpm lint` → `pnpm test:pipeline && test:operations &&
     test:kia && test:env-vars && test:crypto`.
   - Bloque le merge si rouge. **Quick win, fort ROI.**

3. **Reset mensuel des quotas**
   - Aujourd'hui `generationsUsed` s'incrémente mais rien ne le remet à zéro.
     Cron (Trigger.dev scheduled task) ou reset au passage de période Stripe.

4. **Nettoyage des PR stale** (#2 à fermer, #72 à trancher).

---

### 🟧 Phase 2 — Observabilité & données réelles

Objectif : remplacer les **métriques factices** par du vrai, condition de
confiance pour les plans payants.

5. **Métriques d'usage réelles des API déployées**
   - Option A (légère) : le runtime généré logge les requêtes vers un endpoint
     d'ingestion ZeroAPI (`/api/internal/ingest`) → table `ApiRequestMetric`
     agrégée.
   - Option B : scrap des métriques Coolify/conteneur.
   - Alimente les KPIs réels du dashboard (requêtes 24h, p99, erreurs) en
     remplacement de `liveStatsFor`.

6. **Navigateur de données live** (feature Databases)
   - Connexion en lecture aux Postgres provisionnés via Coolify.
   - Listing tables réelles + lignes + count réel (remplace les estimations
     déterministes de `db-tables.ts`).
   - Vue table paginée, filtre simple. (Écriture/édition = phase ultérieure.)

7. **Logs d'exécution runtime** exposés sur la page API (au-delà des logs de
   déploiement Coolify déjà présents).

---

### 🟨 Phase 3 — Déploiement & portabilité

Objectif : ne plus enfermer l'utilisateur sur ZeroAPI Cloud.

8. **Export vers dépôt GitHub** (« Push to GitHub »)
   - OAuth GitHub déjà en place → créer un repo et pousser le bundle généré.
   - Débloque tous les hébergeurs externes sans écrire 4 clients de déploiement.

9. **Boutons de déploiement 1-clic externes**
   - Les générateurs `generateRailwayConfig/Render/Vercel/Fly` existent déjà.
   - Boutons « Deploy to Railway/Render/Vercel » (deep-links + repo GitHub)
     plutôt que des clients API complets — coût faible, valeur réelle.

10. **Domaines personnalisés**
    - Champ domaine custom + instructions CNAME + provisioning Coolify du
      domaine + (option) certif TLS.

---

### 🟩 Phase 4 — Équipe & collaboration

Objectif : ouvrir le plan BUSINESS à de vrais usages multi-utilisateurs.

11. **Espaces de travail / RBAC plateforme**
    - Étendre `TeamMember` : invitations réelles (email + acceptation), rôles
      (owner/admin/member), partage des jobs/conversations à l'échelle de
      l'équipe, quotas mutualisés.

12. **Édition collaborative d'une conversation/spec** (temps réel, optionnel,
    gros chantier — à valider selon la demande).

---

### 🔵 Phase 5 — Capacités de génération (différé, selon demande)

13. **GraphQL** en sortie (en plus de REST).
14. **Webhooks runtime** : vérifier/compléter le comportement à l'exécution
    (retries, signatures) — défini dans la spec mais non audité côté runtime.
15. **Connexion à une base externe** (BYO database) au lieu de provisionner.

---

## 4. Recommandation d'ordre d'exécution

```
Sprint courant   → CI qualité (#2) + fermer PR stale + trancher #72   [1-2 j]
Sprint +1/+2     → Stripe complet (#1, #3)                            [le gros morceau]
Sprint +3        → Métriques réelles (#5) + navigateur données (#6)
Sprint +4        → Export GitHub (#8) + boutons 1-clic (#9)
Backlog          → Domaines custom, équipe/RBAC, GraphQL
```

**Premier pas concret conseillé** : poser la CI (`ci.yml`) — quelques heures,
protège tout le reste — puis attaquer Stripe, seul vrai bloquant pour
transformer la beta en produit générateur de revenus.

---

## 5. Risques & points d'attention

- **Cohérence quotas ↔ abonnement** : `generationsUsed/Limit` doit devenir la
  projection de l'état Stripe, pas une source indépendante.
- **Sécurité ingestion métriques** : l'endpoint d'ingestion doit être
  authentifié par job (clé signée) pour éviter le bruit/abus.
- **Accès DB live** : lecture seule + credentials chiffrés (`crypto-secrets`
  existe déjà), jamais d'exposition de l'URL Postgres au client.
- **Doc désynchronisée** : réaligner `AGENTS.md` pour ne pas induire en erreur
  les prochaines sessions de dev.
</content>
</invoke>
