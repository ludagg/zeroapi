import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — ZeroAPI",
  description:
    "Comment ZeroAPI collecte, utilise et protège tes données personnelles. Conforme au RGPD et à la loi sénégalaise n° 2008-12.",
};

export default function PrivacyPage() {
  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">Légal · Confidentialité</div>
      <h1>
        Politique de <em style={{ fontStyle: "italic" }}>confidentialité</em>
      </h1>
      <div className="updated">Dernière mise à jour : 26 mai 2026</div>

      <div className="callout">
        <strong>L&apos;essentiel.</strong> On ne vend pas tes données. On ne les
        utilise pas pour entraîner nos modèles. On collecte le strict nécessaire pour
        faire fonctionner le service, on chiffre tout en transit et au repos, et tu
        peux exporter ou supprimer tes données quand tu veux.
      </div>

      <div className="toc">
        <h4>Sommaire</h4>
        <ol>
          <li>
            <a href="#responsable">Responsable du traitement</a>
          </li>
          <li>
            <a href="#donnees">Données collectées</a>
          </li>
          <li>
            <a href="#finalites">Finalités et bases légales</a>
          </li>
          <li>
            <a href="#partage">Partage avec des tiers</a>
          </li>
          <li>
            <a href="#transferts">Transferts hors UE / hors UEMOA</a>
          </li>
          <li>
            <a href="#duree">Durée de conservation</a>
          </li>
          <li>
            <a href="#droits">Tes droits</a>
          </li>
          <li>
            <a href="#securite">Sécurité</a>
          </li>
          <li>
            <a href="#contact">Contact et réclamation</a>
          </li>
        </ol>
      </div>

      <h2 id="responsable">1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est <strong>ZeroAPI SAS</strong>, dont le siège
        social est à Dakar, Sénégal, immatriculée au registre du commerce de Dakar.
        Pour toute question relative à tes données personnelles, contacte notre
        Délégué à la protection des données (DPO) à{" "}
        <a href="mailto:dpo@zeroapi.io">dpo@zeroapi.io</a>.
      </p>

      <h2 id="donnees">2. Données collectées</h2>
      <h3>2.1 Données de compte</h3>
      <ul>
        <li>Adresse email, nom et prénom (ou pseudo)&nbsp;;</li>
        <li>Mot de passe (haché avec argon2id, jamais en clair)&nbsp;;</li>
        <li>
          Identifiant tiers si tu utilises Google / GitHub OAuth (sub, email, nom).
        </li>
      </ul>
      <h3>2.2 Données de facturation</h3>
      <ul>
        <li>
          Plan souscrit, historique de facturation, identifiant client Stripe (le
          numéro de carte est traité par Stripe, jamais stocké chez nous)&nbsp;;
        </li>
        <li>
          Pour les comptes professionnels : raison sociale, NINEA / numéro de TVA,
          adresse de facturation.
        </li>
      </ul>
      <h3>2.3 Données d&apos;usage</h3>
      <ul>
        <li>
          Prompts soumis et spécifications générées (nécessaires pour exécuter le
          Service)&nbsp;;
        </li>
        <li>
          Logs techniques (adresse IP, user-agent, horodatage, type d&apos;action)
          conservés pour la sécurité et le debug&nbsp;;
        </li>
        <li>
          Statistiques d&apos;usage anonymisées (nombre de générations, taux
          d&apos;erreur).
        </li>
      </ul>
      <h3>2.4 Cookies</h3>
      <p>
        Détails complets dans notre <a href="/cookies">politique cookies</a>. Nous
        utilisons des cookies essentiels (session, préférence de thème) et, si tu y
        consens, des cookies analytiques anonymes.
      </p>

      <h2 id="finalites">3. Finalités et bases légales</h2>
      <table>
        <thead>
          <tr>
            <th>Finalité</th>
            <th>Base légale</th>
            <th>Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fournir le Service (compte, génération, hébergement)</td>
            <td>Exécution du contrat</td>
            <td>Durée du compte</td>
          </tr>
          <tr>
            <td>Facturation et comptabilité</td>
            <td>Obligation légale</td>
            <td>10 ans</td>
          </tr>
          <tr>
            <td>Sécurité, prévention de la fraude</td>
            <td>Intérêt légitime</td>
            <td>12 mois (logs)</td>
          </tr>
          <tr>
            <td>Communication produit (emails transactionnels)</td>
            <td>Exécution du contrat</td>
            <td>Durée du compte</td>
          </tr>
          <tr>
            <td>Newsletter et communications marketing</td>
            <td>Consentement</td>
            <td>Jusqu&apos;à retrait</td>
          </tr>
          <tr>
            <td>Analytics anonymisés</td>
            <td>Consentement</td>
            <td>13 mois</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Nous n&apos;utilisons pas tes prompts ni ton code généré pour
        entraîner des modèles d&apos;IA</strong>, ni les nôtres ni ceux de tiers, sauf
        consentement explicite et révocable de ta part.
      </p>

      <h2 id="partage">4. Partage avec des tiers</h2>
      <p>
        Nous travaillons avec des sous-traitants qui interviennent strictement pour
        fournir le Service&nbsp;:
      </p>
      <table>
        <thead>
          <tr>
            <th>Sous-traitant</th>
            <th>Rôle</th>
            <th>Localisation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Anthropic, Mistral AI, Google AI</td>
            <td>Modèles d&apos;IA pour génération de code</td>
            <td>États-Unis, Union européenne</td>
          </tr>
          <tr>
            <td>Stripe</td>
            <td>Traitement des paiements</td>
            <td>États-Unis, Irlande</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Emails transactionnels</td>
            <td>États-Unis</td>
          </tr>
          <tr>
            <td>Cloudflare</td>
            <td>CDN, protection DDoS</td>
            <td>Mondial (data centers Afrique de l&apos;Ouest privilégiés)</td>
          </tr>
          <tr>
            <td>AWS, OVH</td>
            <td>Hébergement et stockage</td>
            <td>Paris, Francfort, Dakar (en cours)</td>
          </tr>
          <tr>
            <td>Trigger.dev</td>
            <td>Orchestration des jobs asynchrones</td>
            <td>États-Unis</td>
          </tr>
        </tbody>
      </table>
      <p>
        Tous nos sous-traitants sont liés par un accord de traitement des données (DPA)
        offrant un niveau de protection équivalent au nôtre.
      </p>

      <h2 id="transferts">5. Transferts hors UE / hors UEMOA</h2>
      <p>
        Certains sous-traitants sont situés hors de l&apos;Union européenne et hors de
        l&apos;UEMOA. Les transferts sont encadrés par les clauses contractuelles types
        de la Commission européenne (CCT 2021/914) et, pour les transferts vers les
        États-Unis, par le cadre Data Privacy Framework lorsque le sous-traitant y
        adhère.
      </p>

      <h2 id="duree">6. Durée de conservation</h2>
      <ul>
        <li>
          <strong>Compte actif</strong> : les données sont conservées tant que ton
          compte est actif.
        </li>
        <li>
          <strong>Après suppression du compte</strong> : 30 jours en zone tampon (pour
          permettre la récupération en cas d&apos;erreur), puis suppression définitive.
        </li>
        <li>
          <strong>Données de facturation</strong> : 10 ans (obligation comptable).
        </li>
        <li>
          <strong>Logs de sécurité</strong> : 12 mois.
        </li>
      </ul>

      <h2 id="droits">7. Tes droits</h2>
      <p>Conformément au RGPD et à la loi sénégalaise n° 2008-12, tu disposes :</p>
      <ul>
        <li>
          <strong>Droit d&apos;accès</strong> : obtenir une copie de tes données.
        </li>
        <li>
          <strong>Droit de rectification</strong> : corriger des données inexactes.
        </li>
        <li>
          <strong>Droit à l&apos;effacement</strong> : supprimer tes données (sauf
          obligation légale de conservation).
        </li>
        <li>
          <strong>Droit à la portabilité</strong> : recevoir tes données dans un format
          structuré et machine-lisible (JSON).
        </li>
        <li>
          <strong>Droit d&apos;opposition</strong> : t&apos;opposer à un traitement
          fondé sur l&apos;intérêt légitime.
        </li>
        <li>
          <strong>Droit à la limitation</strong> : suspendre temporairement un
          traitement.
        </li>
        <li>
          <strong>Droit de retirer ton consentement</strong> à tout moment, sans
          remettre en cause la licéité du traitement passé.
        </li>
        <li>
          <strong>Droit de définir des directives post-mortem</strong> sur le sort de
          tes données.
        </li>
      </ul>
      <p>
        Pour exercer ces droits, écris à{" "}
        <a href="mailto:dpo@zeroapi.io">dpo@zeroapi.io</a>. Nous répondons sous 30 jours
        maximum. La plupart de ces droits sont aussi exerçables directement depuis ton
        tableau de bord (« Mes données »).
      </p>

      <h2 id="securite">8. Sécurité</h2>
      <p>
        Détails complets sur notre <a href="/security">page sécurité</a>. En résumé :
        chiffrement TLS 1.3 en transit, AES-256 au repos, authentification deux
        facteurs disponible, audits internes trimestriels, programme de divulgation
        responsable.
      </p>

      <h2 id="contact">9. Contact et réclamation</h2>
      <p>
        Pour toute question : <a href="mailto:dpo@zeroapi.io">dpo@zeroapi.io</a>.
      </p>
      <p>
        Si tu estimes que tes droits ne sont pas respectés, tu peux introduire une
        réclamation auprès de la Commission de protection des données personnelles
        (CDP) du Sénégal, ou, si tu résides dans l&apos;Union européenne, auprès de
        l&apos;autorité de contrôle de ton pays (en France : la CNIL —{" "}
        <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
          www.cnil.fr
        </a>
        ).
      </p>
    </article>
  );
}
