import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RGPD et protection des données — ZeroAPI",
  description:
    "Conformité de ZeroAPI au Règlement général sur la protection des données (RGPD) et à la loi sénégalaise n° 2008-12.",
};

export default function GDPRPage() {
  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">Légal · RGPD</div>
      <h1>
        Conformité <em style={{ fontStyle: "italic" }}>RGPD</em>
      </h1>
      <div className="updated">Dernière mise à jour : 26 mai 2026</div>

      <div className="callout">
        ZeroAPI est conforme au Règlement (UE) 2016/679 (RGPD) et à la loi sénégalaise
        n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère
        personnel. Cette page résume nos engagements pratiques.
      </div>

      <h2>1. Cadre légal applicable</h2>
      <p>
        ZeroAPI traite des données personnelles d&apos;utilisateurs situés au Sénégal,
        dans la zone UEMOA, en Europe et au-delà. Nous appliquons le standard de
        protection le plus élevé applicable à chaque traitement :
      </p>
      <ul>
        <li>
          <strong>RGPD</strong> (UE 2016/679) pour les utilisateurs européens et
          au-delà&nbsp;;
        </li>
        <li>
          <strong>Loi n° 2008-12</strong> du Sénégal pour les utilisateurs
          sénégalais&nbsp;;
        </li>
        <li>
          <strong>Acte additionnel A/SA.1/01/10</strong> de la CEDEAO relatif à la
          protection des données à caractère personnel.
        </li>
      </ul>

      <h2>2. Délégué à la protection des données (DPO)</h2>
      <p>
        Un DPO est désigné. Tu peux le contacter pour toute question relative au
        traitement de tes données :
      </p>
      <p>
        <strong>Email</strong> : <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>
        <br />
        <strong>Adresse postale</strong> : ZeroAPI SAS, à l&apos;attention du DPO,
        Dakar, Sénégal.
      </p>

      <h2>3. Principes que nous appliquons</h2>
      <ul>
        <li>
          <strong>Licéité et transparence</strong> : chaque traitement a une base
          légale claire, documentée dans notre{" "}
          <a href="/privacy">politique de confidentialité</a>.
        </li>
        <li>
          <strong>Minimisation</strong> : nous ne collectons que ce qui est strictement
          nécessaire au service.
        </li>
        <li>
          <strong>Exactitude</strong> : tu peux corriger tes données depuis ton compte.
        </li>
        <li>
          <strong>Limitation de conservation</strong> : durées précises définies dans
          la politique de confidentialité.
        </li>
        <li>
          <strong>Intégrité et confidentialité</strong> : chiffrement systématique,
          accès restreint, audits réguliers.
        </li>
        <li>
          <strong>Responsabilité</strong> : registre des traitements à jour, analyses
          d&apos;impact pour les traitements à risque, formation continue des équipes.
        </li>
      </ul>

      <h2>4. Tes droits</h2>
      <h3>4.1 Comment les exercer</h3>
      <p>
        Tous les droits décrits ci-dessous sont exerçables&nbsp;:
      </p>
      <ul>
        <li>
          <strong>en ligne</strong> : depuis l&apos;onglet « Mes données » de ton
          tableau de bord&nbsp;;
        </li>
        <li>
          <strong>par email</strong> : <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>
          .
        </li>
      </ul>
      <p>
        Nous répondons dans un délai maximum de 30 jours. La réponse est gratuite, sauf
        demande manifestement infondée ou excessive (auquel cas nous pouvons facturer
        des frais raisonnables ou refuser, en motivant).
      </p>

      <h3>4.2 Détail des droits</h3>
      <table>
        <thead>
          <tr>
            <th>Droit</th>
            <th>Description</th>
            <th>Article RGPD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Information</td>
            <td>Savoir ce qu&apos;on fait de tes données.</td>
            <td>13–14</td>
          </tr>
          <tr>
            <td>Accès</td>
            <td>Obtenir une copie de tes données.</td>
            <td>15</td>
          </tr>
          <tr>
            <td>Rectification</td>
            <td>Corriger des données inexactes ou incomplètes.</td>
            <td>16</td>
          </tr>
          <tr>
            <td>Effacement</td>
            <td>Supprimer tes données (« droit à l&apos;oubli »).</td>
            <td>17</td>
          </tr>
          <tr>
            <td>Limitation</td>
            <td>Geler temporairement un traitement contesté.</td>
            <td>18</td>
          </tr>
          <tr>
            <td>Portabilité</td>
            <td>Recevoir tes données dans un format structuré et machine-lisible.</td>
            <td>20</td>
          </tr>
          <tr>
            <td>Opposition</td>
            <td>T&apos;opposer à un traitement fondé sur l&apos;intérêt légitime.</td>
            <td>21</td>
          </tr>
          <tr>
            <td>Décision automatisée</td>
            <td>
              Ne pas faire l&apos;objet d&apos;une décision purement automatisée. Nous
              n&apos;en faisons aucune.
            </td>
            <td>22</td>
          </tr>
          <tr>
            <td>Retrait du consentement</td>
            <td>Révoquer ton consentement à tout moment.</td>
            <td>7</td>
          </tr>
          <tr>
            <td>Directives post-mortem</td>
            <td>Définir le sort de tes données après ton décès.</td>
            <td>Loi française 2016-1321</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Transferts internationaux</h2>
      <p>
        Certains de nos sous-traitants (Anthropic, Stripe, Resend, Trigger.dev) sont
        établis aux États-Unis. Ces transferts reposent sur :
      </p>
      <ul>
        <li>
          les <strong>clauses contractuelles types</strong> de la Commission européenne
          (décision 2021/914)&nbsp;;
        </li>
        <li>
          l&apos;adhésion au <strong>Data Privacy Framework</strong> UE–US pour les
          sous-traitants certifiés&nbsp;;
        </li>
        <li>
          des mesures techniques complémentaires : chiffrement, pseudonymisation des
          payloads quand possible, minimisation du périmètre transféré.
        </li>
      </ul>
      <p>
        La liste détaillée des sous-traitants et de leurs localisations est dans la{" "}
        <a href="/privacy">politique de confidentialité</a>.
      </p>

      <h2>6. Analyses d&apos;impact (AIPD)</h2>
      <p>
        Nous réalisons des analyses d&apos;impact relatives à la protection des données
        pour les traitements présentant un risque élevé pour tes droits et libertés.
        Une AIPD a notamment été conduite pour :
      </p>
      <ul>
        <li>le traitement des prompts par des modèles d&apos;IA tiers&nbsp;;</li>
        <li>les transferts hors UE&nbsp;;</li>
        <li>l&apos;hébergement du code généré.</li>
      </ul>
      <p>
        Le résumé des AIPD est disponible sur demande motivée à{" "}
        <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>.
      </p>

      <h2>7. Violations de données</h2>
      <p>
        En cas de violation de données personnelles, nous notifions :
      </p>
      <ul>
        <li>
          la <strong>CDP du Sénégal</strong> dans les 72 heures (loi 2008-12, art.
          61)&nbsp;;
        </li>
        <li>
          l&apos;<strong>autorité de contrôle européenne</strong> compétente dans les
          72 heures (RGPD art. 33)&nbsp;;
        </li>
        <li>
          les personnes concernées sans délai injustifié quand la violation est
          susceptible d&apos;engendrer un risque élevé (RGPD art. 34).
        </li>
      </ul>

      <h2>8. DPA pour les clients Business</h2>
      <p>
        Pour les clients Business agissant en tant que responsables du traitement de
        données personnelles transitant par leur API hébergée chez nous, un{" "}
        <strong>Data Processing Agreement (DPA)</strong> standard est disponible. Pour
        l&apos;obtenir, écris à <a href="mailto:legal@zeroapi.app">legal@zeroapi.app</a>{" "}
        — il est conforme aux articles 28 du RGPD et inclut les clauses contractuelles
        types pour les transferts internationaux.
      </p>

      <h2>9. Autorités de contrôle</h2>
      <p>Si tu estimes que tes droits ne sont pas respectés, tu peux réclamer auprès :</p>
      <ul>
        <li>
          <strong>Sénégal</strong> : Commission de protection des données personnelles
          (CDP) —{" "}
          <a
            href="https://www.cdp.sn"
            target="_blank"
            rel="noreferrer"
          >
            cdp.sn
          </a>
        </li>
        <li>
          <strong>France</strong> : Commission nationale de l&apos;informatique et des
          libertés (CNIL) —{" "}
          <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
            cnil.fr
          </a>
        </li>
        <li>
          <strong>Côte d&apos;Ivoire</strong> : Autorité de Régulation des
          Télécommunications/TIC (ARTCI) —{" "}
          <a href="https://www.artci.ci" target="_blank" rel="noreferrer">
            artci.ci
          </a>
        </li>
        <li>
          <strong>Autres pays UE</strong> : autorité de ton pays de résidence, listée
          sur{" "}
          <a
            href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
            target="_blank"
            rel="noreferrer"
          >
            edpb.europa.eu
          </a>
          .
        </li>
      </ul>

      <h2>10. Contact</h2>
      <p>
        Pour toute question RGPD ou exercice de tes droits :{" "}
        <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>.
      </p>
    </article>
  );
}
