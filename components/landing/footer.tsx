import Link from "next/link";
import { Brand } from "@/components/landing/brand";

export function LandingFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Brand />
            <p>Générateur de backends asynchrone. Pensé en Afrique, fait pour le monde.</p>
          </div>
          <div className="foot-col">
            <h4>Produit</h4>
            <ul>
              <li>
                <a href="/#produit">Fonctionnalités</a>
              </li>
              <li>
                <a href="/#tarifs">Tarifs</a>
              </li>
              <li>
                <a href="/#demo">Démo</a>
              </li>
              <li>
                <a href="/#faq">FAQ</a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Ressources</h4>
            <ul>
              <li>
                <a href="https://docs.zeroapi.app" target="_blank" rel="noreferrer">
                  Docs
                </a>
              </li>
              <li>
                <a href="https://docs.zeroapi.app/guides" target="_blank" rel="noreferrer">
                  Guides
                </a>
              </li>
              <li>
                <a href="https://docs.zeroapi.app/api" target="_blank" rel="noreferrer">
                  API référence
                </a>
              </li>
              <li>
                <a href="https://status.zeroapi.app" target="_blank" rel="noreferrer">
                  Statut
                </a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Entreprise</h4>
            <ul>
              <li>
                <a href="mailto:bonjour@zeroapi.app">Contact</a>
              </li>
              <li>
                <a href="mailto:carrieres@zeroapi.app">Carrières</a>
              </li>
              <li>
                <Link href="/legal-notice">Mentions légales</Link>
              </li>
              <li>
                <a href="mailto:presse@zeroapi.app">Presse</a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Légal</h4>
            <ul>
              <li>
                <Link href="/terms">Conditions</Link>
              </li>
              <li>
                <Link href="/privacy">Confidentialité</Link>
              </li>
              <li>
                <Link href="/cookies">Cookies</Link>
              </li>
              <li>
                <Link href="/security">Sécurité</Link>
              </li>
              <li>
                <Link href="/gdpr">RGPD</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 ZeroAPI · SAS au capital de 1 000 000 FCFA</span>
          <span className="made">
            <span className="flag" /> Fait à Dakar &amp; Abidjan
          </span>
        </div>
      </div>
    </footer>
  );
}
