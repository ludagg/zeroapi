# Audit produit ZeroAPI — Revue stratégique 360°

> Revue conduite comme une cellule de lancement multi-disciplinaire (Direction
> générale, Produit, Ingénierie, Sécurité/Conformité, Business/Go-to-market,
> Marketing/Growth). Objectif : déterminer ce qu'il faut **ajouter, corriger et
> mettre en scène** pour transformer ZeroAPI d'un excellent produit technique en
> un produit *qui fait parler* et qui s'impose — d'abord sur son marché naturel,
> ensuite à l'échelle mondiale.
>
> Date : 2 juin 2026 · Périmètre : l'intégralité du dépôt (~33 000 lignes TS/TSX)
> · Méthode : lecture du code réel, pas de la documentation déclarative.

---

## 0. Verdict en une page (pour la Direction générale)

**Ce que vous avez réellement construit est meilleur que ce que vous racontez —
et en même temps vous promettez des choses que vous n'avez pas encore.** C'est
la tension centrale de ce produit.

ZeroAPI n'est pas un énième « wrapper ChatGPT qui crache du CRUD ». Le cœur
technique est **sérieux, original et difficile à copier** :

- un **moteur d'opérations déterministe** (l'agent « KIA ») où le LLM ne réécrit
  jamais la spec — il émet des appels d'outils typés que *le code* applique, avec
  une porte de validation et un rollback transactionnel. C'est l'inverse de la
  dérive qui plombe v0/Bolt/Lovable. **C'est votre vrai avantage défendable.**
- un **pipeline asynchrone réel** (Trigger.dev) qui génère code Hono.js + Prisma
  + tests + OpenAPI, bundle ZIP, upload R2 ;
- un **déploiement réellement fonctionnel** via Coolify : provisioning d'une
  Postgres isolée, conteneur Docker, domaine public `api-<slug>.zeroapi.app`,
  injection des variables d'environnement chiffrées. **Vous livrez une API en
  ligne, pas seulement du code.** Peu de concurrents le font de bout en bout.
- un **éditeur de spec visuel** (graphe), un **mode Dev** (OpenAPI/SDK/Postman/
  cURL/Prisma/Mermaid), un **playground**, du **partage public**, un panneau
  **admin**, une isolation **multi-tenant** propre, un **chiffrement AES-256-GCM**
  des secrets. Le niveau de finition est celui d'une vraie startup, pas d'un MVP.

Mais trois trous empêchent un lancement « percutant » crédible aujourd'hui :

1. **Aucun système de paiement.** Zéro. Stripe n'apparaît que dans le marketing
   et les pages légales. Personne ne peut payer. La monétisation est 100 %
   manuelle (un admin change le plan à la main).
2. **Le discours marketing dépasse le produit** sur des points vérifiables
   (tests « exécutés », couverture « 94 % », « CSRF/XSS/SQLi vérifiés ✓»,
   « en-têtes Helmet », « Stripe / SEPA disponibles »). Ce sont des promesses
   réfutables en 30 secondes par un dev technique — exactement le public cible.
3. **Incohérence de prix entre la landing et le code** (gratuit « illimité » sur
   la page, 3 générations/mois dans le code ; prix en FCFA vs EUR ; Pro
   « illimité » vs 150/mois). Cela détruit la confiance au moment précis de la
   conversion.

**La bonne nouvelle :** aucun de ces trois trous n'est un problème
d'architecture. Ce sont des problèmes de *finition de lancement*. Vous êtes à
4–6 semaines d'un lancement réellement percutant, pas à 6 mois.

**Recommandation stratégique centrale :** ne lancez pas comme « un générateur
d'API de plus » sur la scène mondiale saturée (où vous seriez comparé à des
boîtes financées à 9 chiffres). Lancez comme **« le premier backend-as-a-prompt
pensé pour l'Afrique francophone »** — Mobile Money natif, prompt en français/
wolof/lingala/pidgin, hébergement régional, déploiement live en 2 minutes — et
utilisez le moteur déterministe comme **signature technique** qui vous donne la
crédibilité « catégorie mondiale ». On gagne un marché qu'on possède, puis on
généralise. C'est exactement la trajectoire Nubank, Sea/Shopee, Flutterwave.

---

## 1. État réel du produit (ce qui marche vraiment)

| Domaine | État réel | Niveau |
|---|---|---|
| Génération conversationnelle (prompt → spec) | Réel, retry x3, parsing robuste | ★★★★★ |
| Moteur d'opérations KIA (édition déterministe) | Réel, 66 opérations typées, validation + rollback | ★★★★★ |
| Routage multi-LLM par plan + fallback | Réel (Claude/Mistral/Gemini/Groq), clés chiffrées | ★★★★☆ |
| Pipeline asynchrone (Trigger.dev) | Réel, fail-closed, logs par étape | ★★★★☆ |
| Génération code (Hono + Prisma + tests + OpenAPI) | Réel (générateurs purs) | ★★★★☆ |
| Déploiement live (Coolify : DB + conteneur + domaine) | Réel | ★★★★☆ |
| Éditeur de graphe de spec | Réel, interactif | ★★★★☆ |
| Mode Dev (OpenAPI/SDK/Postman/cURL/exports) | Réel | ★★★★☆ |
| Playground (tester les endpoints) | Réel | ★★★★☆ |
| Partage public de spec (`/s/<slug>`) | Réel, lecture seule | ★★★★☆ |
| Auth (Better Auth, OAuth Google/GitHub) | Réel | ★★★★☆ |
| Isolation multi-tenant (ownership userId) | Réel, cohérent | ★★★★★ |
| Chiffrement secrets (AES-256-GCM) | Réel, strict en prod | ★★★★★ |
| Panneau admin (users, plans, providers, routing) | Réel | ★★★★☆ |
| Pages légales + docs + changelog | Réel, structuré | ★★★★☆ |
| **Paiement / facturation** | **ABSENT** | ☆☆☆☆☆ |
| **Métriques d'usage temps réel** | Stubbé (`--`, « sprint 2 ») | ★☆☆☆☆ |
| **Clés API publiques** | Stockées mais **jamais utilisées** pour authentifier | ★★☆☆☆ |
| **Équipes / collaboration** | Incomplet (pas de flux d'acceptation d'invitation) | ★★☆☆☆ |
| **Observabilité (Sentry)** | Variable d'env présente, **non câblé** | ★☆☆☆☆ |

---

## 2. Les écarts critiques marketing ↔ réalité (à régler AVANT toute presse)

Le public cible (développeurs) teste ce qu'on lui promet. Chaque promesse fausse
est une perte de crédibilité irréversible **et** un risque juridique. Liste
exhaustive des écarts vérifiables :

| Promesse affichée | Réalité dans le code | Gravité |
|---|---|---|
| « Stripe / SEPA disponibles » (FAQ), « identifiant client Stripe » (Privacy), Stripe listé comme sous-traitant (GDPR) | Aucune ligne de code de paiement nulle part | 🔴 Juridique + confiance |
| Pricing gratuit « illimité » (landing) | `FREE = 3 générations/mois` (`lib/plans.ts:13`) | 🔴 Conversion |
| Pro « générations illimitées » | `PRO = 150/mois` (`lib/plans.ts:15`) | 🔴 Conversion |
| Prix en FCFA (landing) | Prix en EUR (`lib/plans.ts`) | 🟠 Cohérence |
| « tests exécutés », « tests passed N/N », couverture « 94 % » | Tests **générés** mais jamais exécutés ; le compteur = nb de `it(` dans la suite | 🟠 Crédibilité |
| « CSRF, XSS, SQLi → vérifiés ✓ » | Score sécurité = heuristique sur la *présence* de config (`lib/security-grade.ts`), pas un scan réel du code | 🟠 Crédibilité |
| « en-têtes Helmet » (FAQ + snippet) | Hono n'utilise pas Helmet ; flag `enableHelmet` décoratif | 🟡 Détail technique faux |
| « OpenAPI 3.1 » (landing) | Le runtime génère OpenAPI **3.0.3** | 🟡 Détail |
| Templates : « 1240 générations · ★4.8 » | Stats **codées en dur** (`lib/templates.ts`) | 🟠 Faux signal social |
| « SSO SAML / audit log » (Business) | Aucun SSO, aucun audit log en base | 🟠 Promesse entreprise |
| Bandeau « debug · N conversations » | Visible en prod sur `/conversations` | 🟡 Amateurisme |
| Métriques dashboard « Requêtes/24h » | `--` codé en dur | 🟡 |

**Deux options, une seule recommandée :**
- ❌ Continuer à promettre et espérer que personne ne vérifie → suicide de marque
  sur un public technique.
- ✅ **Aligner le discours sur la réalité** (souvent en *retirant* une phrase) et
  **implémenter en priorité ce qui est stratégique** (paiement, exécution réelle
  des tests). La réalité est déjà impressionnante : vous n'avez pas besoin de
  mentir.

> Note conformité : annoncer Stripe comme sous-traitant dans une politique RGPD
> alors qu'il n'existe pas est juridiquement plus dangereux que ne rien dire.
> À corriger immédiatement (soit on intègre Stripe, soit on retire la mention).

---

## 3. Analyse par rôle

### 3.1 Direction générale / Vision

**Forces.** Une thèse claire (« décris, reviens quand c'est prêt »), un cœur
technique différenciant, une identité régionale assumée (Dakar/Abidjan, FCFA,
Mobile Money, pidgin) qui est un *moat* culturel que les géants US n'attaqueront
pas en premier.

**Risque n°1 : le positionnement « leader mondial » dilue le wedge.** Vouloir
être Supabase + Firebase + Vercel + Stripe pour le monde entier dès le jour 1,
c'est se faire écraser par la comparaison. La stratégie gagnante est
*séquentielle* : **dominer l'Afrique francophone du backend généré**, devenir la
référence incontournable là où personne ne sert bien (Mobile Money, français,
latence régionale, paiement local), **puis** capitaliser sur la signature
technique (moteur déterministe) pour la conquête mondiale.

**Décision à prendre (fondateur) :** quel est le « un seul chiffre qui compte »
pour les 6 prochains mois ? Suggestion : *nombre d'APIs réellement déployées et
en ligne par des utilisateurs distincts*. Pas les inscriptions, pas les
générations — les **déploiements live**. C'est ce qui prouve la valeur de bout
en bout et c'est votre métrique de différenciation.

### 3.2 Produit / UX

**Forces.** Onboarding fluide, command palette (⌘K), thème clair/sombre, graphe
de spec, mode Dev, playground, partage. Le parcours « prompt → spec → édition →
déploiement » existe vraiment.

**Manques / frictions :**
- **Le bouton « Générer » du hero n'est pas câblé** (`type="button"`, sans
  handler). La toute première interaction de chaque visiteur est morte.
- Pas de **template réellement clonable en un clic** : les templates renvoient
  vers `/register?template=` mais le préchargement n'est pas démontré.
- **Pas de “time-to-first-API” visible.** Le « aha moment » (mon API est en
  ligne, voici l'URL, teste-la) devrait être le centre de gravité de tout le
  produit. Il est aujourd'hui enterré dans un onglet.
- **Métriques d'usage absentes** : un utilisateur qui a déployé ne voit pas son
  trafic. Or c'est ce qui crée l'attachement (et justifie l'upsell).
- Bandeau debug + données mockées (templates) à nettoyer.

**Quick wins UX à fort impact :**
1. Câbler le hero pour qu'un prompt depuis la landing crée un compte/une
   conversation pré-remplie (réduction massive de friction d'entrée).
2. Mettre en scène le **« live en 2 minutes »** : après déploiement, un écran
   plein « 🎉 Ton API est en ligne » avec l'URL, un bouton « Tester »
   (playground pré-rempli) et « Partager ».
3. Implémenter réellement les métriques `Requêtes/24h` (au moins un compteur
   simple côté Coolify/proxy) — c'est ce qui rend le dashboard *vivant*.

### 3.3 Ingénierie / Technique

**Forces (rares à ce niveau).** Moteur d'opérations transactionnel, validation
gate non contournable, immutabilité de la spec, confirmation obligatoire des
opérations destructives, multi-LLM avec fallback, zéro mock dans la pipeline.
C'est du travail d'ingénieur sérieux.

**Dettes / risques techniques :**
- **Les tests générés ne sont pas exécutés.** Pour tenir la promesse « testé »,
  il faut une étape qui *lance réellement* la suite Vitest dans le worker (ou un
  sandbox) et stocke un vrai taux de réussite. C'est aussi un futur argument de
  vente massif (« on prouve que ton API marche »).
- **SPOF déploiement** : un seul serveur Coolify (IP en dur `167.86.95.165`),
  token en clair en env. Pas de file d'attente de déploiement, pas de DLQ si le
  dispatch échoue. À durcir avant d'ouvrir le déploiement à grande échelle.
- **Clés API personnelles inertes** : générées, hashées, stockées… mais aucune
  route ne les vérifie. Donc *aucune API publique ZeroAPI n'existe réellement*.
  Soit on les branche (et on a une vraie API programmatique → CLI, CI/CD), soit
  on retire la promesse.
- **Pas d'observabilité** (Sentry non câblé) : en production, vous serez aveugle
  sur les échecs de génération/déploiement. À brancher avant le go-live.
- **Pas d'audit log** : aucune traçabilité des actions admin/critiques. Bloquant
  pour la promesse « Business / audit log » et pour la conformité entreprise.

### 3.4 Sécurité / Conformité / Trust

**Forces.** Isolation multi-tenant cohérente (filtre `userId` partout), AES-256-
GCM strict en prod, hash SHA-256 des clés, sessions signées 7 j, panneau admin
bien gardé, partages publics correctement limités (spec en lecture seule, pas de
secrets). Le risque multi-tenant est *bas* — remarquable.

**À traiter :**
- Rotation du token Coolify ; le sortir du clair (secret manager).
- Rate-limit global Redis sur les routes de génération (anti-abus/coût LLM).
- Audit log (cf. ci-dessus).
- Cohérence des claims RGPD (sous-traitants réels uniquement).
- Politique d'expiration/rotation des clés API personnelles.

### 3.5 Business / Monétisation / Go-to-market

**Le trou béant : pas de paiement.** Tant qu'un utilisateur Pro ne peut pas
cliquer « Payer » et être débité, il n'y a pas de business — seulement une démo.
C'est **le** chantier n°1.

- Le marché cible impose **Mobile Money** (Wave, Orange Money, MTN MoMo, Moov).
  C'est annoncé « bientôt » partout. **En faire la priorité de monétisation, pas
  Stripe.** Wave et Orange Money ont des API ; PayDunya/CinetPay/Paystack
  agrègent plusieurs opérateurs et simplifient l'intégration multi-pays.
- Stripe en complément pour la diaspora/CB internationale.
- Aligner immédiatement `lib/plans.ts` et la landing (mêmes prix, mêmes quotas,
  même devise affichée selon la géo).
- Ajouter un **vrai self-serve upgrade** (aujourd'hui seul un admin peut changer
  un plan) + webhooks de paiement + downgrade gracieux.

**Modèle de valeur à clarifier.** Deux leviers monétisables coexistent et se
brouillent : (a) les *générations* (quota), (b) l'*hébergement* (déploiement
live). Le second est le plus défendable et le plus « collant ». Suggestion :
générations généreuses (voire illimitées pour faire du bruit), monétisation sur
**l'hébergement managé + le trafic + les projets** (à la Vercel/Railway). C'est
d'ailleurs ce que dit déjà la landing (« paye quand tu déploies ») — il « suffit »
de le rendre vrai dans le code.

### 3.6 Marketing / Growth / Différenciation

**Atouts marketing réels et rares :**
- Identité régionale forte et authentique (le pidgin dans une landing tech,
  c'est un *statement*).
- Comparatif frontal Supabase/Firebase bien fait.
- Esthétique soignée, ton direct (tutoiement, « ferme l'onglet »).

**Ce qui manque pour « faire parler » :**
- Un **moment de démo virale** : aujourd'hui la démo est une animation mockée.
  Il faut une **démo live publique** (sans compte) où l'on tape un prompt et on
  voit une vraie API se construire et se déployer. C'est *ça* qu'on partage sur
  X/LinkedIn.
- Une **preuve sociale réelle** (remplacer les stats de templates inventées par
  de vrais compteurs, même petits — l'honnêteté se remarque).
- Un **angle « catégorie »** : ne pas dire « générateur d'API » (commodité) mais
  nommer la catégorie que vous créez, p.ex. **« Backend-as-a-Prompt »** ou
  **« Prompt-to-Production »**.

---

## 4. La/les fonctionnalité(s) qui vont vous différencier

Trois candidats sérieux, par ordre de potentiel « faire parler » :

### 🥇 4.1 Mobile Money natif, généré et déployé (le wedge marché)
Personne, dans la catégorie des générateurs IA de backend, ne génère des
endpoints + webhooks Wave / Orange Money / MTN MoMo prêts à l'emploi, sécurisés
(vérification de signature, idempotence, réconciliation). Vous avez déjà la
plomberie (`customEndpoints`, `inbound webhooks`, env chiffrées, déploiement).
**Transformer ça en bouton « Ajouter les paiements Mobile Money » qui produit du
code marchand réel = un produit que tout un continent de devs attend.** C'est
votre titre de presse : *« La première plateforme qui génère ET déploie un
backend de paiement Mobile Money à partir d'une phrase. »*

### 🥈 4.2 « L'IA qui ne casse jamais ton schéma » (la signature mondiale)
Le moteur KIA (édition déterministe par opérations validées, jamais de réécriture
LLM) est votre vraie supériorité technique face à v0/Bolt/Lovable/Cursor, qui
*dérivent*. Mettez-le en avant comme un argument de *fiabilité* : éditions en
langage naturel **réversibles, validées, sans perte**. Démontrable en vidéo
(« je modifie 40 fois, rien ne casse, undo/redo complet »). C'est ce qui vous
fait passer pour « catégorie mondiale » auprès des devs seniors.

### 🥉 4.3 Du prompt à l'URL publique en 2 minutes (la démo virale)
Vous êtes l'un des rares à aller jusqu'à l'**API réellement en ligne**, testable,
avec sa Postgres. La plupart s'arrêtent au code. Faites-en *la* démo héro :
chrono visible, URL live à la fin, playground intégré. C'est le contenu
partageable.

**Recommandation :** lancer sur **4.1 (Mobile Money)** comme accroche marché +
**4.3 (live en 2 min)** comme démo + **4.2 (moteur déterministe)** comme preuve
de sérieux technique. Les trois racontent une seule histoire cohérente.

---

## 5. Roadmap priorisée (impact × effort)

### NOW — Bloquants de lancement (semaines 1–3)
1. 🔴 **Aligner discours et réalité** : retirer/corriger toutes les promesses
   fausses du §2 (Stripe légal, prix, « illimité », couverture, Helmet, SSO,
   stats templates). *Effort faible, impact confiance énorme.*
2. 🔴 **Paiement self-serve** : au minimum 1 PSP Mobile Money (PayDunya/CinetPay
   ou Wave+OM en direct) + checkout + webhook + upgrade auto + downgrade. Stripe
   pour CB en parallèle si rapide.
3. 🔴 **Cohérence pricing** `lib/plans.ts` ↔ landing (mêmes quotas/prix/devise).
4. 🟠 **Câbler le bouton « Générer » du hero** (entrée du funnel).
5. 🟠 **Nettoyage prod** : bandeau debug, données mockées, métriques `--`.
6. 🟠 **Observabilité** : brancher Sentry (génération + déploiement).

### NEXT — Crédibilité & différenciation (semaines 4–8)
7. **Exécution réelle des tests** dans le worker → vrai taux de réussite affiché.
8. **Bouton Mobile Money** (génération endpoints + webhooks marchands réels).
9. **Métriques d'usage réelles** (requêtes/24h, latence) sur les APIs déployées.
10. **Démo live publique** sans compte (moment viral).
11. **Brancher les clés API** → API programmatique + **CLI `zeroapi`** (deploy
    depuis le terminal/CI). Énorme pour l'adoption dev.
12. **Audit log** + rotation secrets/token Coolify.

### LATER — Passage à l'échelle (trimestre suivant)
13. **Collaboration réelle** (flux d'invitation, rôles, workspaces).
14. **Marketplace de templates** avec vrais compteurs/forks (boucle de croissance).
15. **SSO/SAML** réel pour l'offre Business.
16. **Robustesse déploiement** : multi-serveur, file + DLQ, redéploiements
    versionnés, rollback.
17. **Observabilité produit** (analytics funnel) pour piloter la croissance.

---

## 6. KPIs de lancement à instrumenter

- **North Star : APIs déployées et en ligne / semaine** (utilisateurs distincts).
- Time-to-first-deployed-API (médiane) — viser < 10 min.
- Taux prompt → spec validée → job lancé → déployé (funnel d'activation).
- Taux de réussite réel des tests générés (preuve de qualité).
- Conversion gratuit → payant (impossible aujourd'hui : prérequis = §5.2).
- Coût LLM par génération réussie (marge unitaire).
- Rétention W1/W4 des comptes ayant déployé au moins une API.

---

## 7. Risques majeurs & parades

| Risque | Impact | Parade |
|---|---|---|
| Promesses fausses détectées par des devs | Réputation irréversible | §5.1 avant toute presse |
| Pas de paiement au lancement | Pas de revenu, pas de validation | §5.2 prioritaire |
| SPOF déploiement (1 serveur Coolify) | Panne globale des déploiements | File + multi-serveur, monitoring |
| Coûts LLM non maîtrisés sous charge | Marge négative | Rate-limit Redis, quotas, cache |
| Mention Stripe dans RGPD sans Stripe | Exposition juridique | Corriger immédiatement |
| Aveugle en prod (pas de Sentry/log) | Incidents non détectés | Observabilité avant go-live |

---

## 8. Conclusion (Direction générale)

Vous n'avez pas un problème de produit — vous avez un produit **plus fort que
votre récit**, abîmé par une poignée de promesses non tenues et l'absence de
caisse enregistreuse. Réglez ces deux choses et vous avez, *honnêtement*, un
lancement capable de faire du bruit sur votre marché et d'attirer l'attention
au-delà.

La phrase qui doit guider les 6 prochaines semaines :

> **« On ne promet rien qu'on ne livre — mais ce qu'on livre, personne d'autre ne
> le fait : un backend de paiement Mobile Money, généré et mis en ligne à partir
> d'une phrase, en deux minutes, sans jamais casser ton schéma. »**

Tenez cette phrase dans le code, et la scène viendra à vous.

---

*Document de travail — à challenger. Les références de fichiers/lignes citées
renvoient à l'état du dépôt au 2 juin 2026 (branche d'audit).*
