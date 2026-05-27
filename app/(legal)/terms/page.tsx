import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — ZeroAPI",
  description:
    "Les conditions générales d'utilisation du service ZeroAPI : accès, abonnements, propriété du code généré, responsabilité, juridiction.",
};

export default function TermsPage() {
  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">Légal</div>
      <h1>
        Conditions générales <em style={{ fontStyle: "italic" }}>d&apos;utilisation</em>
      </h1>
      <div className="updated">Dernière mise à jour : 26 mai 2026</div>

      <div className="callout">
        En créant un compte ou en utilisant ZeroAPI, tu acceptes ces conditions. Lis-les
        — elles sont courtes et écrites pour être comprises.
      </div>

      <div className="toc">
        <h4>Sommaire</h4>
        <ol>
          <li>
            <a href="#article-1">Objet et acceptation</a>
          </li>
          <li>
            <a href="#article-2">Description du service</a>
          </li>
          <li>
            <a href="#article-3">Compte utilisateur</a>
          </li>
          <li>
            <a href="#article-4">Abonnements et facturation</a>
          </li>
          <li>
            <a href="#article-5">Propriété intellectuelle et code généré</a>
          </li>
          <li>
            <a href="#article-6">Obligations de l&apos;utilisateur</a>
          </li>
          <li>
            <a href="#article-7">Suspension et résiliation</a>
          </li>
          <li>
            <a href="#article-8">Disponibilité et SLA</a>
          </li>
          <li>
            <a href="#article-9">Limitation de responsabilité</a>
          </li>
          <li>
            <a href="#article-10">Données personnelles</a>
          </li>
          <li>
            <a href="#article-11">Modifications</a>
          </li>
          <li>
            <a href="#article-12">Droit applicable et juridiction</a>
          </li>
        </ol>
      </div>

      <h2 id="article-1">1. Objet et acceptation</h2>
      <p>
        Les présentes Conditions Générales d&apos;Utilisation (« CGU ») régissent
        l&apos;accès et l&apos;utilisation du service ZeroAPI (le « Service »), édité
        par <strong>ZeroAPI SAS</strong>, société par actions simplifiée de droit
        sénégalais immatriculée à Dakar, ayant son siège social à Dakar, Sénégal
        (ci-après « ZeroAPI », « nous »).
      </p>
      <p>
        L&apos;utilisation du Service implique l&apos;acceptation pleine et entière des
        présentes CGU. Si tu n&apos;es pas d&apos;accord, tu ne dois pas utiliser le
        Service.
      </p>

      <h2 id="article-2">2. Description du service</h2>
      <p>
        ZeroAPI est une plateforme de génération asynchrone de backends. À partir
        d&apos;une description en langage naturel, le Service produit :
      </p>
      <ul>
        <li>une spécification technique (modèles, endpoints, relations)&nbsp;;</li>
        <li>du code source TypeScript basé sur Hono.js&nbsp;;</li>
        <li>des tests automatisés (Vitest) et une documentation OpenAPI 3.1&nbsp;;</li>
        <li>
          des options de déploiement (Railway, Render, Vercel, Fly.io) ou
          d&apos;hébergement sur l&apos;infrastructure ZeroAPI selon le plan souscrit.
        </li>
      </ul>
      <p>
        Le Service est en évolution constante. Certaines fonctionnalités peuvent être
        marquées « bêta » et fournies sans garantie.
      </p>

      <h2 id="article-3">3. Compte utilisateur</h2>
      <p>
        L&apos;accès au Service nécessite la création d&apos;un compte. Tu t&apos;engages
        à fournir des informations exactes, à maintenir la confidentialité de tes
        identifiants et à nous notifier sans délai toute utilisation non autorisée. Tu
        es responsable de toute activité réalisée depuis ton compte.
      </p>
      <p>
        Tu dois avoir au moins 16 ans pour utiliser ZeroAPI. Les comptes professionnels
        engagent l&apos;organisation représentée.
      </p>

      <h2 id="article-4">4. Abonnements et facturation</h2>
      <p>Le Service propose trois plans :</p>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Prix</th>
            <th>Engagement</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gratuit</td>
            <td>0 FCFA</td>
            <td>Aucun</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>15 000 FCFA / mois (~ 24 €)</td>
            <td>Mensuel, résiliable à tout moment</td>
          </tr>
          <tr>
            <td>Business</td>
            <td>75 000 FCFA / mois (~ 120 €)</td>
            <td>Mensuel ou annuel</td>
          </tr>
        </tbody>
      </table>
      <p>
        Les paiements sont traités par Stripe. Le paiement par Mobile Money (Orange
        Money, Wave, MTN MoMo, Moov Money) est en cours d&apos;intégration. Les prix
        sont indiqués hors taxes ; les taxes applicables sont ajoutées le cas échéant.
        Les paiements sont non remboursables sauf disposition légale contraire, mais tu
        peux résilier à tout moment et tu conserves l&apos;accès jusqu&apos;à la fin de
        la période payée.
      </p>

      <h2 id="article-5">5. Propriété intellectuelle et code généré</h2>
      <h3>5.1 Le code généré t&apos;appartient</h3>
      <p>
        Tu es propriétaire du code source généré par ZeroAPI pour tes prompts, sans
        restriction d&apos;usage. Tu peux l&apos;exporter, le modifier, le redistribuer
        ou le commercialiser. Il n&apos;y a aucune licence rétroactive sur ton code,
        aucun vendor lock-in.
      </p>
      <h3>5.2 La plateforme nous appartient</h3>
      <p>
        Le logiciel ZeroAPI, l&apos;interface, les modèles propriétaires, la
        documentation et les marques restent notre propriété exclusive. Tu obtiens un
        droit personnel, non exclusif et non transférable d&apos;utilisation, limité à
        la durée de ton abonnement.
      </p>
      <h3>5.3 Tes prompts</h3>
      <p>
        Tu conserves la propriété de tes prompts. Tu nous accordes une licence limitée
        d&apos;utilisation pour exécuter le Service. Nous n&apos;utilisons pas tes
        prompts pour entraîner nos modèles sans ton consentement explicite.
      </p>

      <h2 id="article-6">6. Obligations de l&apos;utilisateur</h2>
      <p>Tu t&apos;engages à ne pas :</p>
      <ul>
        <li>
          utiliser le Service pour générer du contenu illicite, frauduleux,
          discriminatoire ou portant atteinte à autrui&nbsp;;
        </li>
        <li>
          contourner les limitations techniques ou les quotas (rate limiting,
          authentification)&nbsp;;
        </li>
        <li>
          procéder à de l&apos;ingénierie inverse ou à du scraping automatisé non
          autorisé&nbsp;;
        </li>
        <li>
          partager ton compte ou revendre l&apos;accès au Service sans accord écrit.
        </li>
      </ul>

      <h2 id="article-7">7. Suspension et résiliation</h2>
      <p>
        Nous pouvons suspendre ou résilier ton compte en cas de violation des CGU,
        d&apos;impayé prolongé (au-delà de 14 jours après notification), ou
        d&apos;usage manifestement frauduleux. Tu peux résilier ton compte à tout
        moment depuis ton tableau de bord. Tes données et ton code généré sont
        conservés 30 jours après résiliation, puis supprimés définitivement, sauf
        demande contraire de ta part avant ce délai.
      </p>

      <h2 id="article-8">8. Disponibilité et SLA</h2>
      <p>
        Nous nous efforçons d&apos;assurer une disponibilité élevée du Service. Un SLA
        contractuel de 99,9 % est garanti sur le plan Business. Les plans Gratuit et
        Pro sont fournis « best effort ». Les opérations de maintenance planifiées sont
        annoncées sur{" "}
        <a href="https://status.zeroapi.app" target="_blank" rel="noreferrer">
          status.zeroapi.app
        </a>
        .
      </p>

      <h2 id="article-9">9. Limitation de responsabilité</h2>
      <p>
        Le Service est fourni « tel quel ». Nous ne garantissons pas qu&apos;il sera
        exempt d&apos;erreurs ou que le code généré conviendra à tout usage spécifique.
        Tu es responsable de la revue, des tests et du déploiement du code en
        production.
      </p>
      <p>
        Dans toute la mesure permise par la loi, notre responsabilité totale envers toi
        au titre des CGU est limitée au montant que tu as payé à ZeroAPI au cours des
        douze (12) derniers mois précédant l&apos;événement déclencheur. Nous ne sommes
        pas responsables des dommages indirects, pertes de données, pertes
        d&apos;exploitation ou pertes de chiffre d&apos;affaires.
      </p>

      <h2 id="article-10">10. Données personnelles</h2>
      <p>
        Le traitement de tes données personnelles est décrit dans notre{" "}
        <a href="/privacy">politique de confidentialité</a> et notre{" "}
        <a href="/gdpr">page conformité RGPD</a>. ZeroAPI agit en tant que responsable
        du traitement pour les données de compte et en tant que sous-traitant pour les
        prompts soumis dans le cadre du Service.
      </p>

      <h2 id="article-11">11. Modifications</h2>
      <p>
        Nous pouvons modifier les présentes CGU. Toute modification substantielle te
        sera notifiée par email au moins 30 jours avant son entrée en vigueur. La
        poursuite de l&apos;utilisation du Service après cette notification vaut
        acceptation.
      </p>

      <h2 id="article-12">12. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU sont régies par le droit sénégalais. Tout litige relatif à
        leur interprétation ou leur exécution sera soumis à la compétence exclusive
        des tribunaux de Dakar, sauf disposition d&apos;ordre public contraire
        applicable aux utilisateurs consommateurs résidant dans l&apos;Union
        européenne.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Pour toute question relative aux CGU :{" "}
        <a href="mailto:legal@zeroapi.app">legal@zeroapi.app</a>.
      </p>
    </article>
  );
}
