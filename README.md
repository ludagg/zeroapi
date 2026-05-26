# ZeroAPI

Plateforme web — Sprint 1.

## Setup

```bash
pnpm install
cp .env.example .env.local   # remplir les variables
pnpm db:generate
pnpm db:push                  # crée le schéma sur la base
pnpm dev
```

Voir `AGENTS.md` pour la roadmap et l'architecture.

## Stack

- **Next.js 14** (App Router, Server Components)
- **Tailwind CSS 3** + design system custom (palette `--accent: #10F083`)
- **Prisma 5** + PostgreSQL
- **Better Auth** (email/password + Google + GitHub)
- **TypeScript strict**, **Zod**, **React Hook Form**

## Polices

- Instrument Serif (titres en italique)
- Space Grotesk (UI)
- JetBrains Mono (chiffres, code, métadonnées)
