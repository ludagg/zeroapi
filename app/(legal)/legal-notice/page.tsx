import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales — ZeroAPI",
  description:
    "Mentions légales de ZeroAPI : éditeur, hébergeur, propriété intellectuelle et contact.",
};

export default function LegalNoticePage() {
  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">Légal</div>
      <h1>
        Mentions <em style={{ fontStyle: "italic" }}>légales</em>
      </h1>
      <div className="updated">Dernière mise à jour : 26 mai 2026</div>

      <h2>Éditeur du site</h2>
      <p>
        <strong>ZeroAPI SAS</strong>
        <br />
        Société par actions simplifiée au capital de 1 000 000 FCFA
        <br />
        Siège social : Dakar, Sénégal
        <br />
        Immatriculation : Registre du commerce de Dakar
        <br />
        Email : <a href="mailto:bonjour@zeroapi.io">bonjour@zeroapi.io</a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>Le représentant légal de ZeroAPI SAS.</p>

      <h2>Hébergement</h2>
      <p>
        Le site et l&apos;application <strong>zeroapi.io</strong> sont hébergés par&nbsp;:
      </p>
      <ul>
        <li>
          <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA 91723,
          États-Unis — <a href="https://vercel.com" target="_blank" rel="noreferrer">
            vercel.com
          </a>
        </li>
        <li>
          <strong>Amazon Web Services EMEA SARL</strong>, 38 avenue John F. Kennedy,
          L-1855 Luxembourg (régions Paris et Francfort).
        </li>
        <li>
          <strong>OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France.
        </li>
      </ul>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble du site — design, textes, illustrations, code source de la
        plateforme — est protégé par le droit de la propriété intellectuelle et reste
        la propriété exclusive de ZeroAPI SAS, sauf mention contraire. Toute
        reproduction ou représentation, totale ou partielle, sans autorisation
        préalable écrite est interdite.
      </p>
      <p>
        Le code généré par ZeroAPI à la demande d&apos;un utilisateur appartient à cet
        utilisateur, dans les conditions prévues aux{" "}
        <a href="/terms">conditions générales d&apos;utilisation</a>.
      </p>

      <h2>Marques</h2>
      <p>
        « ZeroAPI » et le logo associé sont des marques de ZeroAPI SAS. Les autres
        marques citées (Railway, Render, Vercel, Fly.io, Stripe, Anthropic, etc.)
        appartiennent à leurs propriétaires respectifs.
      </p>

      <h2>Liens hypertextes</h2>
      <p>
        Le site peut contenir des liens vers des sites tiers. ZeroAPI n&apos;exerce
        aucun contrôle sur ces sites et décline toute responsabilité quant à leur
        contenu.
      </p>

      <h2>Crédits</h2>
      <p>
        Conception et développement : équipe ZeroAPI. Polices : Instrument Serif et
        Space Grotesk (Google Fonts, licence SIL Open Font). Icônes : Lucide (licence
        ISC).
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question d&apos;ordre général :{" "}
        <a href="mailto:bonjour@zeroapi.io">bonjour@zeroapi.io</a>
        <br />
        Pour les questions juridiques :{" "}
        <a href="mailto:legal@zeroapi.io">legal@zeroapi.io</a>
        <br />
        Pour les données personnelles :{" "}
        <a href="mailto:dpo@zeroapi.io">dpo@zeroapi.io</a>
        <br />
        Pour la sécurité :{" "}
        <a href="mailto:security@zeroapi.io">security@zeroapi.io</a>
      </p>
    </article>
  );
}
