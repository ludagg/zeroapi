# DEPLOYMENT.md — Mise en ligne de ZeroAPI (lancement gratuit)

Runbook pas-à-pas pour publier la plateforme **en mode gratuit** : tous les
quotas (FREE = 3 générations) fonctionnent, les plans payants restent visibles
mais l'upgrade se fait **manuellement via l'admin** (aucun paiement à intégrer
pour ce lancement). Stripe pourra être branché plus tard sans bloquer la mise
en ligne.

> Référence des variables : [`.env.production.example`](./.env.production.example).
> Architecture & pipeline : [`AGENTS.md`](./AGENTS.md).

---

## 1. Architecture à déployer

ZeroAPI se compose de **trois choses** à provisionner :

| Composant | Rôle | Où |
|---|---|---|
| **App Next.js 14** | UI + API routes + auth | Vercel, ou tout host Node 20 (`next build` / `next start`) |
| **Worker Trigger.dev v3** | exécute les jobs de génération asynchrones | Trigger.dev Cloud (`trigger.config.ts`, projet déjà défini) |
| **PostgreSQL managée** | données (users, jobs, déploiements, marketplace) | Neon / Supabase / Railway Pg (avec backups) |

Services externes requis : **Cloudflare R2** (stockage des ZIP), **Resend**
(emails), **au moins un fournisseur LLM** (Anthropic recommandé). Redis, OAuth,
Sentry et Coolify (« ZeroAPI Cloud ») sont optionnels.

---

## 2. Provisionner les services

1. **Postgres** managée avec backups auto. Récupère l'URL au format
   `postgresql://user:pass@host:port/db?sslmode=require`.
2. **Cloudflare R2** : crée un bucket + une paire de clés API
   (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
   Sans R2, le worker retombe sur un fallback local `.bundles/` qui **ne survit
   pas aux redéploiements** → non viable en prod.
3. **Resend** : crée une clé API et **vérifie ton domaine d'envoi** (DKIM/SPF/
   DMARC) pour éviter le spam. Définis `RESEND_FROM` avec ce domaine.
4. **LLM** : au minimum `ANTHROPIC_API_KEY`. Ajoute `MISTRAL_API_KEY` /
   `GEMINI_API_KEY` pour le routage par plan et le fallback.
5. **Trigger.dev Cloud** : ouvre le projet (`trigger.config.ts` →
   `proj_hogagmocthrpqsvtgmxe`) et récupère `TRIGGER_SECRET_KEY` +
   `TRIGGER_PROJECT_REF`. Crée aussi un **Personal Access Token** (`tr_pat_…`)
   pour le déploiement CI.

---

## 3. Générer les secrets

```bash
openssl rand -base64 32   # → BETTER_AUTH_SECRET
openssl rand -base64 32   # → SECRETS_ENCRYPTION_KEY
```

> ⚠️ `SECRETS_ENCRYPTION_KEY` chiffre les variables d'env des utilisateurs au
> repos (AES-256-GCM). **Si tu la perds, les secrets stockés sont
> irrécupérables.** Stocke les deux dans le secret manager de l'hébergeur,
> jamais dans le repo.

---

## 4. Variables d'environnement (minimum pour le lancement gratuit)

Reporte ces clés dans le dashboard de l'hébergeur (et dans Trigger.dev pour le
worker). `[REQUIS]` = l'app ne tourne pas correctement sans.

```env
# [REQUIS]
DATABASE_URL=
NEXT_PUBLIC_APP_URL=https://app.zeroapi.app
NODE_ENV=production
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=https://app.zeroapi.app
SECRETS_ENCRYPTION_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
RESEND_FROM="ZeroAPI <noreply@zeroapi.app>"
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_REF=

# Recommandé
R2_PUBLIC_URL=            # sinon URLs signées 7j
REDIS_URL=               # requis dès >1 instance (rate-limit cohérent)
MISTRAL_API_KEY=
GEMINI_API_KEY=

# Optionnel
GOOGLE_CLIENT_ID=         # OAuth Google
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=         # OAuth GitHub
GITHUB_CLIENT_SECRET=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
# COOLIFY_* → uniquement si tu actives le déploiement « ZeroAPI Cloud »
```

`NEXT_PUBLIC_APP_URL` et `BETTER_AUTH_URL` doivent être **identiques**, en HTTPS,
sans slash final.

---

## 5. Base de données

Depuis un environnement ayant accès à `DATABASE_URL` de prod :

```bash
pnpm install
pnpm prisma migrate deploy     # applique les migrations (prisma/migrations/)
pnpm db:seed-templates         # charge les 7 templates officiels (idempotent)
```

`migrate deploy` n'altère pas les données existantes (contrairement à
`db push --accept-data-loss` réservé au dev).

---

## 6. Déployer l'app Next.js

**Build & start** (host Node générique) :

```bash
pnpm build      # = prisma generate && next build
pnpm start      # = next start  (écoute sur $PORT, 3000 par défaut)
```

**Sur Vercel** : connecte le repo, le framework Next.js est détecté
automatiquement. Renseigne toutes les variables de la section 4 dans
Settings → Environment Variables. Build command par défaut (`next build`) — le
`postinstall` lance déjà `prisma generate`.

---

## 7. Déployer le worker Trigger.dev

Le worker est déployé **séparément** de l'app, via le workflow déjà présent
[`.github/workflows/trigger-deploy.yml`](./.github/workflows/trigger-deploy.yml)
(push sur `main`). Il exige le secret repo **`TRIGGER_ACCESS_TOKEN`** (le PAT
`tr_pat_…`, pas la clé projet).

Déploiement manuel équivalent :

```bash
npx trigger.dev@latest deploy
```

> Sans worker déployé + `TRIGGER_SECRET_KEY` côté app, la génération retombe en
> best-effort dans le process Next (OK pour une démo, pas pour la prod).

---

## 8. OAuth (si activé)

Enregistre les callback URLs (sinon le login social échoue) :

- Google : `${NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
- GitHub : `${NEXT_PUBLIC_APP_URL}/api/auth/callback/github`

OAuth est désactivé proprement si les variables sont absentes — l'email/mot de
passe suffit pour lancer.

---

## 9. Bootstrap admin & gestion des plans (lancement gratuit)

Il n'y a pas de paiement : l'**upgrade de plan est manuel**.

1. Crée ton compte via l'UI (`/register`).
2. Promeus-le admin en base :

   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'toi@exemple.com';
   ```

3. Va sur `/admin` → **Users** pour changer le plan d'un utilisateur
   (`FREE` → `STARTER`/`PRO`/`BUSINESS`) et ajuster ses quotas à la main.

Les CTA « Voir les plans » pointent vers `/#pricing` (page vitrine) — les plans
restent visibles, l'attribution se fait par l'admin.

---

## 10. Vérification post-déploiement (smoke test)

- [ ] `GET /` (landing) répond **200** derrière le load balancer (healthcheck).
- [ ] `/login` et `/register` s'affichent ; inscription + email de vérification
      reçu (Resend).
- [ ] Connexion → `/dashboard` accessible.
- [ ] Une conversation génère une spec, **un job se crée et passe `READY`**
      (preuve que le worker Trigger.dev tourne).
- [ ] Le ZIP se télécharge (R2 → URL signée ou `R2_PUBLIC_URL`).
- [ ] L'email « job prêt » arrive.
- [ ] `/admin` accessible uniquement pour le compte ADMIN.

---

## 11. Checklist go-live condensée

- [ ] Postgres managée + backups, `prisma migrate deploy` exécuté, templates seedés
- [ ] `BETTER_AUTH_SECRET` & `SECRETS_ENCRYPTION_KEY` générés et stockés en vault
- [ ] Domaine Resend vérifié (DKIM/SPF/DMARC), `RESEND_FROM` correct
- [ ] R2 configuré (`R2_PUBLIC_URL` ou URLs signées)
- [ ] `TRIGGER_SECRET_KEY` + worker déployé (`TRIGGER_ACCESS_TOKEN` en secret CI)
- [ ] `ANTHROPIC_API_KEY` défini pour la qualité des specs
- [ ] `NEXT_PUBLIC_APP_URL` == `BETTER_AUTH_URL` (HTTPS, sans slash)
- [ ] Compte admin bootstrappé (`role = 'ADMIN'`)
- [ ] Smoke test section 10 vert

---

## 12. Rollback & exploitation

- **App** : redeploy la version précédente depuis le dashboard de l'hébergeur.
- **DB** : `migrate deploy` est additif ; une seule migration existe à ce jour
  (`20260602120000_marketplace_templates`). Pour revenir en arrière, restaure un
  backup Postgres — ne supprime pas une migration déjà appliquée.
- **Worker** : redeploy via `npx trigger.dev@latest deploy` ou re-run du workflow.
- **Multi-instance** : passe `REDIS_URL` pour un rate-limit cohérent entre pods.

---

## Plus tard (post-lancement)

- **Stripe** : checkout + webhook + page `/dashboard/billing` + `stripeCustomerId`
  sur `User`, pour passer du gratuit au payant.
- **Tests** : Vitest sur les routes API (la CI couvre déjà `typecheck` +
  `test:pipeline`).
- **Observabilité** : activer Sentry (`SENTRY_DSN`).
