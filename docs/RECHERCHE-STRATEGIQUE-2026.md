# ZeroAPI — Rapport de recherche stratégique (sourcé & vérifié)

> Recherche multi-sources conduite façon cellule de stratégie (5 angles, recherche
> web en éventail, vérification adversariale, notation de confiance). Objectif :
> décider des **fonctionnalités différenciantes** et de la **stratégie de
> lancement** pour faire de ZeroAPI « le Figma du backend » et viser le leadership.
>
> Date : 2 juin 2026. À lire avec l'audit produit (`docs/AUDIT-PRODUIT-2026.md`).

## Légende de confiance & méthode

- 🟢 **Haute** : source primaire (Gartner, Stack Overflow Survey, GSMA, S-1
  Figma, TechCrunch/CNBC sur levées, a16z, OpenView, Lenny's Newsletter).
- 🟡 **Moyenne** : trackers tiers d'ARR/usage (Sacra, GetLatka, Panto) ou presse
  reprenant un rapport primaire non ouvert.
- 🔴 **Faible / à recouper** : estimation d'un seul analyste ou blog secondaire.

> Avertissement : les chiffres d'ARR des startups privées proviennent largement
> d'estimateurs tiers (non audités) — traités en fourchettes. Les valorisations et
> levées sont mieux corroborées. À re-vérifier sur sources primaires avant tout
> usage externe (presse, deck investisseurs) : PDF GSMA SOTIR, rapport BCG 2026,
> S-1 Figma (SEC), grilles tarifaires Orange/MTN.

---

## 1. Synthèse exécutive — la thèse en 6 points

1. **La fenêtre est ouverte et énorme, mais se referme.** Le marché de l'AI code
   tooling pèse ~7,4 Md$ en 2025 (CAGR ~27 %) 🟡, et Gartner valorise les seuls
   *agents de code en entreprise* à ~9,8-11 Md$ annualisés en 2026 🟢. 84 % des
   développeurs utilisent ou prévoient d'utiliser l'IA (vs 76 % en 2024) 🟢.

2. **Le marché est en crise de confiance — c'est votre ouverture.** Seuls ~3 %
   des développeurs font « fortement confiance » à la précision de l'IA, 46 % s'en
   méfient activement, et **66 % citent comme frustration n°1 le code “presque
   juste, mais pas tout à fait”** 🟢. 45 % du code généré par IA échoue aux tests
   de sécurité, sans amélioration avec la taille des modèles 🟢. Le déterminisme
   de ZeroAPI (l'IA ne réécrit jamais le schéma) répond *exactement* à la douleur
   la plus citée.

3. **L'angle mort concurrentiel est le “backend de production déployé”.** Les
   fusées (Lovable 6,6 Md$/200 M$ ARR 🟢, v0, Bolt) sont nées *frontend* et
   ajoutent le backend après coup, souvent via Supabase. Lovable annonçait *encore
   en décembre 2025* « prévoir d'ajouter bases de données, paiements et
   hébergement » 🟢. ZeroAPI livre déjà l'API live + Postgres. C'est le terrain
   que personne n'occupe pleinement.

4. **Le wedge marché est l'Afrique francophone / Mobile Money.** 485 M de comptes
   mobile money et 357 Md$ de transactions en Afrique de l'Ouest en 2024 🟡, 4,7 M
   de développeurs sur le continent (+21 %/an, plus forte croissance mondiale) 🟢,
   et une **fragmentation structurelle des paiements** (3-5 wallets/pays, doc et
   sandbox inégales) que personne n'a résolue côté dev-first.

5. **Le modèle gagnant est PLG + collaboratif “façon Figma”.** Figma : 13 M+
   d'utilisateurs, NDR 134 %, 95 % du Fortune 500, et **70 % des deals Enterprise
   ont démarré avec un seul utilisateur sur un plan Pro** 🟢. Le « magic moment »
   = la collaboration multijoueur, *architecturale et non rétrofittable*.

6. **Le pricing doit être hybride (base + usage), pas par siège.** a16z : le
   per-seat s'effondre quand des agents font le travail sans humain 🟢 ; 7 des 9
   meilleures IPO SaaS en rétention sont usage-based 🟡. Modèles de référence :
   Vercel/Railway (forfait bas + consommation).

**La phrase de positionnement recommandée :**
> *« Le premier backend collaboratif qui se génère à partir d'une phrase, se
> déploie en 2 minutes, et ne casse jamais ton schéma — Mobile Money inclus. »*

---

## 2. Tendances IA codegen — la fenêtre & la faille à exploiter

**Taille & croissance.** AI code tools ~7,37 Md$ en 2025 → ~24 Md$ en 2030 (CAGR
26,6 %, Mordor) 🟡 ; agents de code entreprise ~9,8-11 Md$ annualisés en 2026
(Gartner) 🟢. Dépenses en logiciels d'agents IA : 86 Md$ (2025) → 206 Md$ (2026)
🟢.

**Adoption massive.** 84 % des devs utilisent/prévoient l'IA (2025) 🟢 ; Gartner :
90 % des ingénieurs en entreprise utiliseront un assistant IA d'ici 2028 (vs <14 %
début 2024) 🟢 ; ~80 % des nouveaux devs GitHub utilisent Copilot dès la 1re
semaine 🟢.

**La faille (= votre angle).**
- Confiance dans la précision IA : ~29 % positive en 2025 (vs ~40 % avant) ; 3,1 %
  « font fortement confiance » 🟢.
- **66 % : frustration n°1 = code “presque juste”** ; 45 % perdent du temps à
  déboguer le code IA 🟢.
- Sécurité : **45 % du code IA échoue aux tests de sécurité** (jusqu'à 72 % en
  Java) ; les modèles plus gros **ne s'améliorent pas** en sécurité 🟢 (Veracode).
- Dette mesurable : duplication de code 8,3 %→12,3 % (2021-2024), refactoring
  divisé par ~2,5 (GitClear) 🟡 ; DORA 2024 : −7,2 % de stabilité de livraison
  malgré 75 % de gains perçus 🟢 ; METR : devs experts **19 % plus lents** avec
  l'IA alors qu'ils se croyaient 20 % plus rapides 🟢.
- Gartner : >40 % des projets d'IA agentique seront annulés d'ici 2027 (valeur
  floue, risque mal maîtrisé) 🟢 ; l'autonomie réelle reste au niveau 1-2.

**Insight.** Ne vendez pas la vitesse (illusoire et documentée comme telle) :
vendez la **fiabilité de l'output système** — contrats validés, non-régression,
sécurité par construction, déploiement gouverné de bout en bout. C'est précisément
ce que Gartner identifie comme le différenciateur des gagnants et le point
d'échec des perdants.

---

## 3. Concurrence — la carte & l'angle mort

| Acteur | Backend prod déployé ? | Prix (2025-26) | Traction | Conf. |
|---|---|---|---|---|
| **v0** (Vercel) | Non (UI-first, s'appuie sur Supabase) | Crédits : Free/Premium 20$/Team 30$ | ~42-50 M$ ARR, 4 M+ users | 🟡 |
| **Bolt.new** | Récent (Bolt Cloud, août 2025) | Crédits/usage | ~40 M$ ARR, ~700 M$ valo | 🟡 |
| **Lovable** | **Pas encore natif (déc. 2025)** | Crédits | **200 M$ ARR, 6,6 Md$ valo** | 🟢 |
| **Replit Agent** | Oui (full-stack + DB) | Effort-based (0,06$→$) | ~250 M$ ARR, 9 Md$ valo | 🟡 |
| **Supabase** | BaaS (pas de génération IA) | Free/Pro 25$/Team 599$ | ~70 M$ ARR, 5 Md$ valo, 4 M dev | 🟡 |
| **Firebase Studio** | Oui mais **migration forcée <2027** | Blaze pay-as-you-go | Google | 🟡 |
| **Convex** | BaaS/SDK (codé en TS) | Free/Pro 25$/membre | a16z 26 M$ (2022) | 🟡 |
| **Wasp** | Framework auto-hébergé | Open source | Seed 1,5 M$ (2021) | 🟢 |
| **Cursor** | Non (IDE) | Pro 20$/Business 40$/Ultra 200$ | **2 Md$ ARR, ~29 Md$ valo** | 🟢 |
| **Windsurf** | Non (IDE) | — | Racheté par Cognition (2025) | 🟢 |

**Les 5 angles morts exploitables :**
1. **Backend de production = quasi universellement sous-servi.** Les leaders sont
   UI-first ; même Lovable (6,6 Md$) n'avait pas de backend natif fin 2025 🟢.
2. **Pricing à l'usage/effort = anxiogène pour la prod** (v0, Replit, Firebase).
   Un prix par projet/API déployé *prévisible* différencie.
3. **Les IDE (Cursor, Windsurf) ne déploient rien** — pas concurrents frontaux ;
   ZeroAPI peut se positionner en aval (« code où tu veux, déploie avec ZeroAPI »).
4. **Firebase Studio porte un risque de discontinuité** (migration <2027) 🟡 —
   argument de stabilité.
5. **Le BaaS pur exige de concevoir/coder le backend** (Supabase, Convex).
   L'intersection « génération IA + déploiement managé + API de prod » reste
   ouverte — **mais la fenêtre est étroite** (Supabase capte déjà les vibe-coders).

---

## 4. Mobile Money / Afrique — le wedge défendable

**Le marché.** Afrique : 1 105 Md$ de transactions mobile money en 2024 (+15 %),
1,1 Md de comptes 🟢. **Afrique de l'Ouest : 485 M de comptes, 357 Md$, 74
services actifs (région n°1)** 🟡. Bancarisation classique UEMOA ~23 % 🟡 → le
mobile money *est* le rail. La BCEAO a lancé le paiement instantané interopérable
(PI-SPI) en pilote 2024 🟢.

**Le vivier dev.** 4,7 M de développeurs en Afrique, +21 %/an (2019-24, record
mondial) 🟢 ; Nigeria 1,1 M sur GitHub (+28 %) 🟢.

**Les APIs de paiement (couverture & accès).**
- **Wave** : frais plats 1 %, API publique (Business/Payout/Checkout), SN + CI,
  ~8 M users/mois au SN 🟢.
- **Orange Money** : API Web Payment publique (11+ pays franco) mais **accès sur
  candidature manuelle** + KYA 🟢.
- **MTN MoMo** : Open API publique, **sandbox gratuite sans installation**, 14+
  pays 🟢.
- **Agrégateurs** : PayDunya (6 pays, 2-3,5 %) et CinetPay (9 pays, ~3,5 %→1,5 %)
  unifient 15+ méthodes 🟡. Flutterwave (licence BCEAO 2025) et Paystack (CI)
  entrent dans le franco 🟡.

**La douleur (= l'opportunité).** Fragmentation technique ET réglementaire ;
les devs réclament **sandbox fiables, meilleur support, transparence** (TechCabal
2025) 🟡. Personne ne sert cela en *dev-first natif* : un ZeroAPI qui **génère ET
déploie** des endpoints + webhooks Mobile Money (signature vérifiée, idempotence,
réconciliation, déboursement de masse) prêts à l'emploi adresse un besoin réel et
chiffrable, sans équivalent chez v0/Bolt/Lovable/Supabase.

---

## 5. Go-to-market & pricing — le playbook chiffré

**Lancements qui ont fait du bruit (à copier).**
- **Tagline comparatif “open-source alternative to X”** : Supabase (« alternative
  open-source à Firebase ») → 2 jours en une de Hacker News 🟡.
- **Launch HN / Product Hunt + projet open source amont comme funnel** : Resend
  (react.email) → **6 469 inscrits en 7 semaines**, « the Stripe for Email »
  (Paul Graham) 🟢.
- **Communauté Discord comme support + boucle produit** : Railway 🟢.

**Pricing — la règle.** a16z : le per-seat n'est plus l'unité atomique quand des
agents livrent de la valeur sans humain ; vendre des sièges IA = « espérer que le
client n'utilise pas le produit » (marges rongées par les tokens) 🟢. **Hybride
base + usage** (Vercel Pro 20$ + conso ; Railway 5$/20$ + vCPU/RAM/egress) 🟢 ; 7
des 9 meilleures IPO en NDR sont usage-based 🟡.

**Benchmarks PLG à viser (cibles vérifiables) :**
- Conversion freemium self-serve : 3-5 % = bon, **6-8 % = excellent** 🟢.
- Free trial : 8-12 % bon, 15-25 % excellent 🟢.
- Activation : médiane SaaS 30 %, **viser >36 %** (moyenne) puis 60e/80e
  percentile 🟢.
- Suivre les PQL → +61 % de probabilité de croissance rapide 🟢.
- PLG = 2-3× la croissance des modèles sales-led, CAC plus bas 🟡.

**Recommandations de lancement pour ZeroAPI :**
1. Lancer en **Launch HN + Product Hunt** avec tagline : *« le backend déployé,
   généré par IA — l'alternative dev-first à Supabase/Firebase, Mobile Money
   inclus »*.
2. **Open-sourcer un composant amont** (p. ex. la DSL de spec + le runtime
   `@ludagg/zeroapi-runtime`, ou un SDK Mobile Money unifié) comme aimant à
   étoiles GitHub et funnel.
3. **Pricing hybride** : générations généreuses (faire du bruit) ; monétiser
   l'**hébergement + trafic + projets déployés** (collant, prévisible) — c'est
   déjà la promesse « paye quand tu déploies » de la landing, à rendre vraie.
4. **Discord first** pour le support et la boucle produit.
5. Instrumenter activation/conversion/PQL dès le jour 1 (aujourd'hui absent).

---

## 6. Devenir « le Figma du backend » — les 5 fonctionnalités à bâtir

**Pourquoi Figma a gagné (faits).** 13 M+ MAU, dont **2/3 non-designers** et ~30 %
de développeurs 🟢 ; NDR 134 %, marge brute 88 %, Rule of 40 = 63 🟢 ; part de
marché design 7 %→90 % (2017-2023) 🟡 ; **70 % des deals Enterprise nés d'un seul
utilisateur Pro** 🟢. Le moteur : la **collaboration multijoueur**, choix
*architectural* (serveur autoritaire, 2,2 Md de changements/jour, 95 % persistés
en ~600 ms) **impossible à rétrofitter** 🟢. Free tier gagnant : **collaborateurs
illimités**, projets limités (jamais l'inverse) 🟢. Communauté : 150 k+ ressources
🟡 ; Notion 30 k+ templates / 2 000+ créateurs 🟡. Branching Figma = « pull request
pour le design » 🟢, héritier du modèle social-coding de GitHub 🟢.

**Les 5 features différenciantes pour ZeroAPI (par ordre de levier) :**

1. **Multijoueur temps réel sur le schéma/le graphe de spec** — curseurs en
   direct, co-édition des modèles/endpoints dans le navigateur. *Votre éditeur de
   graphe existe déjà* : le rendre collaboratif natif est le « magic moment » non
   réplicable. C'est ce qui justifie le nom « Figma du backend ».
2. **Partage par lien instantané + rôles (viewer/editor), collaboration jamais
   bridée par le paywall.** *Le partage `/s/<slug>` existe* — l'étendre à
   l'édition multi-utilisateurs. Chaque lien partagé = canal d'acquisition (dev
   invite PM/QA/data).
3. **Branching + pull-request sur le backend** (spec, migrations, config) avec
   revue/merge — l'équivalent Git que les devs *attendent*. Le moteur
   d'opérations déterministe (KIA) + l'historique de spec (`specHistory`,
   `specVersion`) en base **vous donnent déjà 80 % des fondations** : versioning,
   undo/redo, snapshots. Il manque les branches nommées et le merge.
4. **Historique de versions nommé + restauration granulaire** — rassure pour
   adopter l'outil sur de l'infra critique. Fondations déjà présentes.
5. **Marketplace communautaire de templates de backend forkables** (auth,
   e-commerce Mobile Money, CRM, marketplace…) + créateurs monétisables.
   *Vos templates existent mais avec des stats fictives* : les rendre réels,
   forkables en 1 clic, avec vrais compteurs → boucle de croissance à la Figma
   Community / Notion.

**Atout décisif :** vous n'avez pas à tout construire de zéro — l'éditeur de
graphe, le partage, l'historique de spec et les templates **existent déjà**.
L'écart vers « le Figma du backend » est l'ajout de la **collaboration temps réel
+ branching + marketplace réel**, pas une refonte.

---

## 7. Recommandations consolidées (ce qu'il faut décider)

**Positionnement (catégorie à créer) :** « Backend collaboratif généré par IA »
/ « Le Figma du backend ». Pas « un générateur d'API de plus ».

**Séquence de conquête :**
1. **Gagner d'abord un réseau atomique** (Lenny Rachitsky 🟢) : la communauté dev
   d'Afrique de l'Ouest francophone, via le wedge Mobile Money + français/pidgin +
   déploiement live. Devenir *incontournable* là où personne ne sert bien.
2. **Capitaliser sur la signature technique** (déterminisme/fiabilité, backend
   déployé) pour la crédibilité mondiale auprès des devs seniors méfiants de l'IA.
3. **Activer la boucle collaborative “Figma”** (multijoueur + partage + templates)
   pour la croissance virale bottom-up et l'expansion (NDR).

**3 features pour le lancement “percutant” (cohérentes en une seule histoire) :**
- 🥇 **Mobile Money natif généré + déployé** (le wedge, le titre de presse).
- 🥈 **L'IA déterministe qui ne casse jamais ton schéma** (la preuve technique).
- 🥉 **Du prompt à l'URL live en 2 min** (la démo virale, sans compte).

**Pricing :** hybride. Générations généreuses ; monétisation sur hébergement /
trafic / projets / sièges collaboratifs payants au-delà du free. Prix local
(FCFA + Mobile Money) ET international (CB/Stripe diaspora).

---

## 8. KPIs cibles (dérivés des benchmarks)

| Métrique | Cible (benchmark sourcé) |
|---|---|
| North Star | **APIs déployées live / sem.** par users distincts (métrique de différenciation) |
| Activation | >36 % (moyenne SaaS) → 60e percentile 🟢 |
| Conversion freemium | 6-8 % = excellent 🟢 |
| NDR (cible long terme) | 120-134 % (zone Figma/top PLG) 🟢 |
| Suivi PQL | Oui (+61 % proba. croissance rapide) 🟢 |
| Time-to-first-deployed-API | < 10 min (médiane) |

---

## 9. Risques & angles à re-vérifier sur sources primaires

- Chiffres d'ARR concurrents (Sacra/GetLatka) : **fourchettes, non audités** 🟡.
- Données Afrique de l'Ouest : ouvrir le **PDF GSMA SOTIR** + rapport **BCG 2026**
  pour confirmer 485 M comptes / 357 Md$ 🟡.
- Grilles tarifaires Orange Money/MTN : souvent **non publiées** (négociées) — à
  confirmer avant tout claim public.
- Métriques Figma : confirmer sur la **S-1 SEC** originale 🟢/🟡.
- Fenêtre concurrentielle **étroite** : Supabase/Bolt convergent vite vers le
  backend généré — exécuter vite sur le wedge.
- METR (n=16, repos matures) et McKinsey (labo, 2023) : robustes
  *directionnellement*, ne pas surinterpréter.

---

*Rapport de travail — chaque affirmation porte sa source et sa confiance.
À recouper sur sources primaires avant usage externe (presse, levée de fonds).*
