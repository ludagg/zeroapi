# ZeroAPI — Pub motion-graphics (Remotion)

Vidéo publicitaire ~30s pour ZeroAPI, construite avec [Remotion](https://remotion.dev).
Projet **isolé** : il a ses propres dépendances et ne touche pas l'app Next.js racine.

## Aperçu

- **5 scènes / 30s / 30fps** : reveal de marque → conversation avec Kia + spec en direct →
  génération des livrables + code → arguments → CTA.
- **3 formats** depuis le même code (layout responsive) :
  - `ZeroApiPromoLandscape` — 1920×1080 (web, YouTube, LinkedIn)
  - `ZeroApiPromoVertical` — 1080×1920 (WhatsApp Status, TikTok, Reels)
  - `ZeroApiPromoSquare` — 1080×1080 (feed)
- Branding fidèle au produit (`app/icon.svg`, `app/layout.tsx`, `app/landing.css`) :
  vert `#10F083`, Instrument Serif / Space Grotesk / JetBrains Mono.

## Installation

```bash
cd remotion
npm install      # ou pnpm install
```

## Aperçu interactif

```bash
npm run studio
```

Ouvre Remotion Studio (localhost) — choisis une composition et scrube la timeline.

## Rendu MP4

```bash
npm run render            # paysage  → out/zeroapi-promo.mp4
npm run render:vertical   # vertical → out/zeroapi-promo-vertical.mp4
npm run render:square     # carré    → out/zeroapi-promo-square.mp4
npm run render:all        # les trois
```

> ⚠️ **Réseau requis au 1er rendu.** Remotion télécharge `chrome-headless-shell`
> (~150–300 Mo). En environnement hors-ligne / verrouillé, le rendu échoue avec
> « Downloading Chrome Headless Shell ».
> Parades :
> - pré-charger une fois en ligne : `npm run browser` (`remotion browser ensure`) ;
> - ou pointer un Chrome système :
>   `REMOTION_BROWSER_EXECUTABLE=/usr/bin/google-chrome npm run render`
>   (ou flag `--browser-executable=<path>`).
> FFmpeg est fourni par Remotion (rien à installer).

## Audio (optionnel)

La vidéo est conçue pour être **parfaitement lisible sans son**. Pour ajouter une
musique de fond :

1. Dépose un fichier **libre de droits / licencié** dans `public/` (ex. `bgm.mp3`).
2. Renseigne `AUDIO_SRC = "bgm.mp3"` dans `src/Root.tsx`.

Le composant gère un fondu d'entrée/sortie automatique (`src/compositions/ZeroApiPromo.tsx`).

## Structure

```
src/
  index.ts                  registerRoot
  Root.tsx                  3 compositions (formats) + chargement des polices
  theme.ts / fonts.ts       tokens couleurs + polices (source unique)
  layout.ts / utils.ts      orientation responsive + typewriter
  data/script.ts            textes FR verbatim, ressources, livrables, code
  components/               Logo, ChatBubble, SpecPanel, DeliverableCard, CodeBlock, Grain, CTAButton
  scenes/                   Scene1Intro … Scene5Outro
  compositions/ZeroApiPromo.tsx   assemblage <Series> + audio
```
