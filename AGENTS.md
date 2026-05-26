# AGENTS.md — ZeroAPI Platform
> Instructions permanentes pour Claude Code
> Projet : ZeroAPI — La plateforme web
> Fondateur : Ludovic Aggaï NGABANG
> Date : 26 Mai 2026
> Statut : Sprint 1

---

## 🎯 CONTEXTE DU PROJET

ZeroAPI est une plateforme qui génère des backends complets
à partir d'une description en langage naturel.

**Flow principal :**
```
Utilisateur décrit son API
        ↓
Claude API génère une Spec JSON
        ↓
Job créé en base (asynchrone)
        ↓
Trigger.dev envoie au worker VPS
        ↓
@ludagg/zeroapi-runtime génère l'API
        ↓
ZIP stocké sur Cloudflare R2
        ↓
Notification email → Resend
        ↓
Utilisateur revient voir son API prête
```

---

## 🗂️ STRUCTURE DU PROJET

```
zeroapi/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx          ← Vue d'ensemble
│   │   ├── jobs/
│   │   │   ├── page.tsx          ← Liste des jobs
│   │   │   └── [id]/
│   │   │       └── page.tsx      ← Détail job en cours
│   │   ├── apis/
│   │   │   ├── page.tsx          ← Liste APIs
│   │   │   └── [id]/
│   │   │       └── page.tsx      ← Détail API
│   │   ├── deployments/
│   │   │   └── page.tsx
│   │   ├── databases/
│   │   │   └── page.tsx
│   │   ├── members/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── generate/
│   │   └── page.tsx              ← Écran de génération (conversation IA)
│   ├── api/
│   │   ├── generate/
│   │   │   └── route.ts          ← Endpoint génération Spec JSON
│   │   ├── jobs/
│   │   │   └── [id]/
│   │   │       └── route.ts      ← Statut d'un job
│   │   ├── deploy/
│   │   │   └── route.ts          ← Déploiement sur notre VPS
│   │   └── trigger/
│   │       └── route.ts          ← Webhook Trigger.dev
│   └── page.tsx                  ← Landing page (HTML existant à intégrer)
├── components/
│   ├── ui/                       ← Shadcn components
│   ├── dashboard/
│   │   ├── StatsCards.tsx        ← 4 KPIs (jobs, APIs, requêtes, coût)
│   │   ├── JobsList.tsx          ← Liste jobs avec statuts
│   │   ├── GeneratePrompt.tsx    ← Zone de prompt rapide
│   │   ├── ActivityFeed.tsx      ← Activité récente
│   │   └── DeploymentsList.tsx   ← Déploiements actifs
│   ├── generate/
│   │   ├── ChatInterface.tsx     ← Conversation avec l'IA
│   │   ├── PlanPreview.tsx       ← Plan généré à valider
│   │   └── AgentsProgress.tsx    ← Agents qui travaillent
│   ├── api-detail/
│   │   ├── EndpointsList.tsx     ← Liste des endpoints
│   │   ├── SecurityReport.tsx    ← Score sécurité
│   │   ├── TestsReport.tsx       ← Résultats tests
│   │   ├── DeployButtons.tsx     ← Boutons Railway/Render/Vercel
│   │   └── CodeViewer.tsx        ← Code source avec syntax highlighting
│   └── layout/
│       ├── Sidebar.tsx           ← Navigation latérale
│       ├── Header.tsx            ← Header avec notifications
│       └── ThemeToggle.tsx       ← Dark/Light mode
├── lib/
│   ├── claude.ts                 ← Client Claude API
│   ├── prisma.ts                 ← Client Prisma
│   ├── trigger.ts                ← Client Trigger.dev
│   ├── r2.ts                     ← Client Cloudflare R2
│   ├── resend.ts                 ← Client Resend
│   ├── redis.ts                  ← Client Redis
│   ├── auth.ts                   ← Better Auth config
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── triggers/
│   └── generate-api.ts           ← Job Trigger.dev
├── workers/
│   └── runtime-worker.ts         ← Appelle @ludagg/zeroapi-runtime
└── .env.local
```

---

## 🗄️ SCHÉMA BASE DE DONNÉES

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  avatar        String?
  plan          Plan      @default(FREE)
  generationsUsed Int     @default(0)
  generationsLimit Int    @default(3)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  jobs          Job[]
  deployments   Deployment[]
  teamMembers   TeamMember[]
}

model Job {
  id            String    @id @default(cuid())
  userId        String
  name          String
  description   String
  status        JobStatus @default(PENDING)
  spec          Json?             ← La Spec JSON générée
  zipUrl        String?           ← URL du ZIP sur R2
  errorMessage  String?
  endpoints     Int?
  testsTotal    Int?
  testsPassed   Int?
  securityScore String?
  estimatedTime Int?              ← En secondes
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user          User      @relation(fields: [userId], references: [id])
  deployment    Deployment?
  agentLogs     AgentLog[]
}

model AgentLog {
  id        String   @id @default(cuid())
  jobId     String
  agent     String   ← "clarifier", "orchestrator", "code", "security", "tests"
  status    String   ← "pending", "running", "done", "error"
  message   String?
  duration  Int?     ← En ms
  createdAt DateTime @default(now())

  job       Job      @relation(fields: [jobId], references: [id])
}

model Deployment {
  id         String           @id @default(cuid())
  userId     String
  jobId      String           @unique
  platform   DeployPlatform
  url        String?
  status     DeploymentStatus @default(PENDING)
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  user       User             @relation(fields: [userId], references: [id])
  job        Job              @relation(fields: [jobId], references: [id])
}

model TeamMember {
  id        String   @id @default(cuid())
  userId    String
  email     String
  role      String   @default("member")
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
}

enum Plan {
  FREE
  STARTER
  PRO
  BUSINESS
}

enum JobStatus {
  PENDING
  RUNNING
  READY
  DEPLOYED
  FAILED
}

enum DeployPlatform {
  RAILWAY
  RENDER
  VERCEL
  FLYIO
  ZEROAPI_CLOUD
}

enum DeploymentStatus {
  PENDING
  DEPLOYING
  ONLINE
  FAILED
}
```

---

## 📐 SPEC JSON / DSL

La spec consommée par `@ludagg/zeroapi-runtime` suit la DSL ZeroAPI :

- **`version` est OBLIGATOIRE** (string, ex : `"1.0"`)
- **`fields` est un `Record<string, FieldDefinition>`** (objet indexé par
  nom de champ), **PAS un tableau**.
- **`auth.strategy`** prend `"jwt" | "apikey" | "bearer"` —
  **PAS `auth.type`**.
- Les endpoints CRUD sont configurés par ressource via
  `endpoints?: CrudAction[]`, **pas dans un tableau plat au niveau racine**.

```ts
type FieldType =
  | "string" | "text" | "number" | "integer" | "boolean"
  | "date" | "datetime" | "email" | "url" | "uuid" | "file"

interface FieldDefinition {
  type: FieldType
  required?: boolean
  unique?: boolean
  default?: string | number | boolean | null
  min?: number; max?: number
  minLength?: number; maxLength?: number
  description?: string
}

interface ResourceDefinition {
  name: string
  description?: string
  fields: Record<string, FieldDefinition>
  endpoints?: ("list" | "create" | "read" | "update" | "delete")[]
  auth?: { required: boolean; roles?: string[]; strategy?: "jwt" | "apikey" | "bearer" }
  rbac?: { read?: string[]; write?: string[]; delete?: string[] }
  relations?: RelationDefinition[]
  customEndpoints?: CustomEndpointDef[]
}

interface ZeroAPISpec {
  version: string                      // ← OBLIGATOIRE
  name: string
  description?: string
  auth?: { strategy: "jwt" | "apikey" | "bearer"; secret?: string }
  roles?: { name: string; inherits?: string[] }[]
  rateLimit?: { windowMs: number; max: number }
  cors?: { origins: string[] }
  resources: ResourceDefinition[]      // ← OBLIGATOIRE, au moins 1
  authFlows?: { passwordReset?: boolean; refreshTokens?: boolean; revocation?: boolean }
  requiredEnv?: string[]
}
```

**Exemple minimal valide** (passe `parseSpec()`) :

```json
{
  "version": "1.0",
  "name": "test",
  "resources": [
    {
      "name": "items",
      "fields": {
        "title": { "type": "string", "required": true }
      }
    }
  ]
}
```

**Validation** : toujours passer la spec brute par
`parseSpec(raw)` (exporté par `@ludagg/zeroapi-runtime`). Il combine
validation Zod structurelle et vérifications sémantiques (intégrité des
relations) et lance `ParseError` avec détails par champ en cas d'échec.

---

## 🤖 INTÉGRATION CLAUDE API

```typescript
// lib/llm-router.ts — multi-provider (Claude / Mistral / Gemini)
// avec routage par plan (FREE → Mistral/Gemini, PRO → Claude)
// et fallback automatique sur les autres providers en cas d'erreur.

// Prompt conversation (PHASE 1 + 2) :
export const CONVERSATION_SYSTEM_PROMPT = `
Tu es l'assistant de génération de ZeroAPI.
Tu aides l'utilisateur à définir son backend API en français.

PHASE 1 — COMPRÉHENSION :
Pose des questions ciblées pour comprendre :
- Les ressources (entités) du projet et leurs champs
- Les relations entre elles
- Les rôles utilisateurs (RBAC)
- Le type d'authentification (jwt / apikey / bearer)
- Les intégrations spéciales (paiements, SMS, uploads)

PHASE 2 — PLAN :
Quand tu as assez d'informations, présente un plan structuré
et demande validation.

RÈGLES :
- Toujours en français
- Maximum 2 questions à la fois
- Ne JAMAIS produire de JSON dans la conversation
`

// Prompt génération de spec (PHASE 3, déclenché par "launch") :
// décrit la shape EXACTE de la DSL ci-dessus et exige du JSON pur.
export const SPEC_SYSTEM_PROMPT = `…`
```

---

## ⚙️ RUNTIME — `@ludagg/zeroapi-runtime`

`createRuntime(spec, options?)` retourne un `RuntimeResult` avec
**exactement ces clés** :

```ts
interface RuntimeResult {
  app: Hono                                  // instance Hono montée en mémoire
  prismaSchema: string                       // schéma Prisma sérialisable
  zodSchemas: Record<string, ResourceSchemas> // create/update par ressource
  testSuite: string                          // suite Vitest sérialisable
  openApiSpec: OpenAPISpec                   // OpenAPI 3.0.3 JSON
  spec: ZeroAPISpec                          // spec validée/normalisée
}
```

⚠️ **Pas de `result.endpoints` ni `result.tests.total/passed`** —
ces métriques se dérivent côté plateforme :

```ts
import { countEndpoints } from "@/lib/spec"

const endpoints = countEndpoints(spec)
const testsTotal = (result.testSuite.match(/\bit\(/g) ?? []).length
```

**Les `deployConfigs` ne sont PAS dans `RuntimeResult`** — utiliser les
helpers dédiés exportés par `@ludagg/zeroapi-runtime` :

```ts
import {
  generateRailwayConfig,   // → railway.toml
  generateRenderConfig,    // → render.yaml
  generateVercelConfig,    // → vercel.json
  generateFlyConfig,       // → fly.toml
} from "@ludagg/zeroapi-runtime"

const railway = generateRailwayConfig(spec)
const render  = generateRenderConfig(spec)
const vercel  = generateVercelConfig(spec)
const fly     = generateFlyConfig(spec)
```

Le ZIP exportable est assemblé dans `workers/zip-bundle.ts` avec JSZip
(DEFLATE niveau 6) et contient :

```
├── README.md            ← généré (stack + démarrage + déploiement)
├── package.json         ← scripts dev/build/test/prisma
├── tsconfig.json        ← strict
├── .env.example         ← dérivé de validateEnv(spec) + requiredEnv
├── .gitignore
├── src/server.ts        ← boot @hono/node-server → createRuntime(spec)
├── spec.json            ← la spec validée
├── openapi.json         ← result.openApiSpec
├── prisma/schema.prisma ← result.prismaSchema
├── tests/api.test.ts    ← result.testSuite
└── deploy/{railway.toml, render.yaml, vercel.json, fly.toml}
```

---

## ⚡ TRIGGER.DEV v3 — JOB ASYNCHRONE

```typescript
// triggers/generate-api.ts
import { task } from "@trigger.dev/sdk/v3"
import { runGenerationWorker } from "@/workers/runtime-worker"

export const GENERATE_API_TASK_ID = "generate-api" as const

export const generateApiTask = task({
  id: GENERATE_API_TASK_ID,
  maxDuration: 600,
  retry: { maxAttempts: 1 },
  run: async (payload: { jobId: string; spec: ZeroAPISpec }) => {
    await runGenerationWorker(payload)
    return { jobId: payload.jobId, status: "completed" as const }
  },
})

// lib/jobs.ts — déclenchement depuis l'API route :
import { tasks } from "@trigger.dev/sdk/v3"
await tasks.trigger<typeof generateApiTask>(GENERATE_API_TASK_ID, payload)
```

Le worker `runGenerationWorker({ jobId, spec })` enchaîne les agents
(clarifier → orchestrator → code → security → tests → upload),
loggue chaque étape dans `AgentLog`, monte le runtime,
build le ZIP, upload sur R2 (ou écrit dans `.bundles/<jobId>.zip`
en fallback dev), puis envoie l'email via Resend.

Variables d'env Trigger.dev v3 : `TRIGGER_SECRET_KEY` et
`TRIGGER_PROJECT_REF` (anciens `TRIGGER_API_KEY` / `TRIGGER_API_URL`
supprimés).

---

## 🎨 DESIGN — IMPORTANT

Le fondateur a déjà des fichiers HTML avec le design complet
des écrans suivants :
- Dashboard Vue d'ensemble
- Liste des jobs
- Détail d'une API
- Activité récente

**RÈGLE ABSOLUE :** Quand le fondateur fournit un fichier HTML,
tu dois extraire exactement les styles, couleurs, typographie,
et composants pour les reproduire fidèlement en React/Tailwind.
Ne jamais réinventer le design — toujours respecter l'existant.

**Palette de couleurs :**
- Fond : blanc / gris très clair
- Accent : vert électrique (#22c55e ou similaire)
- Texte : noir profond
- Statuts :
  - EN COURS : orange
  - PRÊT : vert
  - EN LIGNE : vert foncé
  - ÉCHEC : rouge

---

## 📱 ÉCRANS À IMPLÉMENTER

### 1. Dashboard (/dashboard)
- Greeting personnalisé ("Bonsoir [Prénom]")
- 4 KPIs : Jobs ce mois / APIs déployées / Requêtes 24h / Coût
- Zone de prompt rapide avec bouton "Démarrer"
- Liste des jobs récents avec filtres (Tous / En cours / Prêts / Échoués)
- Compteur de générations (ex: 47/100)
- Bouton "Passer Business" si plan limité

### 2. Écran de génération (/generate)
- Interface conversationnelle avec l'IA
- Messages de l'IA + réponses utilisateur
- Preview du plan en temps réel
- Visualisation des agents qui travaillent
- États : conversation → plan → confirmation → job créé

### 3. Détail API (/apis/[id])
- Nom + version + statut (EN LIGNE / PRÊT)
- Stats : URL, endpoints, couverture tests, DB, requêtes 24h
- Onglets : Aperçu / Endpoints / Code source / Tests / Docs OpenAPI / Logs / Déploiement
- Modèles de données avec champs et relations
- Score sécurité avec détails
- Boutons : Régénérer / Exporter / Déployer nouvelle version

### 4. Liste jobs (/jobs)
- Tableau avec : nom, version, description, endpoints, auth, statut, temps
- Filtres et recherche
- Statuts colorés

---

## 🔐 AUTHENTIFICATION — BETTER AUTH

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    }
  }
})
```

---

## 📦 VARIABLES D'ENVIRONNEMENT

```env
# Base de données (PostgreSQL sur VPS)
DATABASE_URL=postgresql://...

# Claude API
ANTHROPIC_API_KEY=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Trigger.dev
TRIGGER_API_KEY=
TRIGGER_API_URL=

# Cloudflare R2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Resend
RESEND_API_KEY=

# Redis
REDIS_URL=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 📦 DÉPENDANCES PRINCIPALES

```json
{
  "dependencies": {
    "next": "14",
    "react": "^18",
    "@ludagg/zeroapi-runtime": "latest",
    "@prisma/client": "^5",
    "better-auth": "latest",
    "@trigger.dev/sdk": "^3",
    "@trigger.dev/react-hooks": "^3",
    "@aws-sdk/client-s3": "^3",
    "resend": "^3",
    "ioredis": "^5",
    "tailwindcss": "^3",
    "@shadcn/ui": "latest",
    "lucide-react": "latest",
    "recharts": "^2",
    "shiki": "^1"
  }
}
```

---

## ✅ ORDRE DE DÉVELOPPEMENT — SPRINT 1

```
1. Setup Next.js 14 + Tailwind + Shadcn
2. Prisma schema + migration
3. Better Auth configuré
4. Pages auth (login/register)
5. Layout dashboard (sidebar + header)
6. Dashboard page (KPIs + jobs récents)
7. Page de génération (conversation IA)
8. API route /api/generate (Claude API → Spec JSON)
9. Trigger.dev job configuré
10. Worker runtime (@ludagg/zeroapi-runtime)
11. Détail API (onglets complets)
12. Notifications email (Resend)
```

---

## ✅ RÈGLES ABSOLUES

1. **Respecter le design HTML fourni** — extraire et convertir fidèlement
2. **TypeScript strict** — zéro `any`
3. **App Router uniquement** — pas de pages/
4. **Server Components par défaut** — Client Components seulement si nécessaire
5. **Zod** pour toute validation de formulaire et API
6. **Gestion d'erreurs complète** — chaque appel API dans try/catch
7. **Loading states** — chaque action async a un état de chargement
8. **Responsive** — mobile first
9. **Accessibilité** — aria-labels, focus management

---

## ✅ STUBS DÉBRANCHÉS

État de la pipeline génération à fin de sprint :

- ✅ **`createRuntime` branché** — l'agent "code" appelle
  `createRuntime(spec, options)` et extrait
  `prismaSchema` / `testSuite` / `openApiSpec` pour le bundle.
  L'instance Hono est validée en mémoire avant export.
- ✅ **Upload R2 branché** — `lib/r2.ts` utilise
  `@aws-sdk/client-s3` configuré pour Cloudflare R2
  (endpoint `https://<account>.r2.cloudflarestorage.com`, region `auto`)
  + `@aws-sdk/s3-request-presigner` pour URLs signées 7j.
  Fallback `.bundles/<jobId>.zip` quand les creds manquent.
- ✅ **Trigger.dev v3 branché** — `task({ id, run })` dans
  `triggers/generate-api.ts`, déclenché via
  `tasks.trigger<GenerateApiTask>(GENERATE_API_TASK_ID, payload)`.
  Fallback exécution locale si `TRIGGER_SECRET_KEY` est absent.
- ✅ **Pipeline E2E vert** — `pnpm test:pipeline` exécute
  parseSpec → createRuntime → /health 200 → GET /items 200 →
  buildBundle (ZIP avec 14 fichiers) sans toucher Prisma.

---

*Ce fichier est la source de vérité pour Claude Code.*
*Ne jamais dévier de ces specs sans validation du fondateur.*
*Package runtime : @ludagg/zeroapi-runtime*
