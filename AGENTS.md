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

## 🤖 INTÉGRATION CLAUDE API

```typescript
// lib/claude.ts

// Le prompt système pour la conversation de génération
export const GENERATION_SYSTEM_PROMPT = `
Tu es l'assistant de génération de ZeroAPI.
Tu aides l'utilisateur à définir son backend API.

PHASE 1 — COMPRÉHENSION :
Pose des questions ciblées pour comprendre :
- Les ressources (entités) du projet
- Les relations entre elles
- Les rôles utilisateurs
- Le type d'authentification
- Les fonctionnalités spéciales

PHASE 2 — PLAN :
Génère un plan structuré et demande validation.

PHASE 3 — SPEC JSON :
Une fois validé, génère UNIQUEMENT un JSON 
conforme au format ZeroAPISpec de @ludagg/zeroapi-runtime.

RÈGLES :
- Toujours en français
- Maximum 2 questions à la fois
- Être concis et précis
- Ne jamais générer la Spec sans validation du plan
`

// Génère la Spec JSON depuis la conversation
export async function generateSpec(
  messages: Message[]
): Promise<ZeroAPISpec>
```

---

## ⚡ TRIGGER.DEV — JOB ASYNCHRONE

```typescript
// triggers/generate-api.ts

export const generateApiJob = trigger.defineJob({
  id: "generate-api",
  name: "Generate API from Spec",
  version: "1.0.0",
  trigger: eventTrigger({ name: "api.generate" }),

  run: async (payload, io) => {
    const { jobId, spec } = payload

    // 1. Clarificateur
    await io.logger.info("Agent Clarificateur...")
    await updateAgentLog(jobId, "clarifier", "running")

    // 2. Orchestrateur
    await io.logger.info("Agent Orchestrateur...")
    await updateAgentLog(jobId, "orchestrator", "running")

    // 3. Génération via @ludagg/zeroapi-runtime
    await io.logger.info("Génération du code...")
    const result = await createRuntime(spec)

    // 4. ZIP et upload sur R2
    const zipUrl = await uploadToR2(result, jobId)

    // 5. Mise à jour du job
    await updateJob(jobId, {
      status: "READY",
      zipUrl,
      endpoints: result.endpoints.length,
      testsTotal: result.tests.total,
      testsPassed: result.tests.passed
    })

    // 6. Email de notification
    await sendNotificationEmail(jobId)
  }
})
```

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

*Ce fichier est la source de vérité pour Claude Code.*
*Ne jamais dévier de ces specs sans validation du fondateur.*
*Package runtime : @ludagg/zeroapi-runtime*
