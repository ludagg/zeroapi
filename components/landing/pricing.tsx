import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function Cross() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function Pricing() {
  return (
    <section id="tarifs">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">Tarifs</span>
          <h2 className="display">
            Démarre gratuit.
            <br />
            <em>Paye</em> quand tu déploies.
          </h2>
          <p>
            Génération illimitée même en gratuit. L&apos;hébergement sur
            l&apos;infrastructure ZeroAPI est réservé aux plans payants.
          </p>
        </Reveal>

        <div className="plans">
          <Reveal as="div" className="plan" delay={0}>
            <div className="plan-name">Gratuit</div>
            <div className="plan-tag">Pour explorer et apprendre.</div>
            <div className="plan-price">
              0<small>FCFA / mois</small>
            </div>
            <div className="plan-meta">Pour toujours.</div>
            <div className="plan-divider" />
            <ul className="plan-feat-list">
              <li>
                <Check /> 3 générations / mois
              </li>
              <li>
                <Check /> Export Git complet
              </li>
              <li>
                <Check /> Docs OpenAPI
              </li>
              <li className="dim">
                <Cross /> Hébergement ZeroAPI
              </li>
              <li className="dim">
                <Cross /> Support prioritaire
              </li>
            </ul>
            <Link href="/register" className="btn btn-ghost">
              Commencer
            </Link>
          </Reveal>

          <Reveal as="div" className="plan featured" delay={100}>
            <span className="plan-badge">★ Populaire</span>
            <div className="plan-name">Pro</div>
            <div className="plan-tag">Pour les builders sérieux.</div>
            <div className="plan-price">
              15 000<small>FCFA / mois</small>
            </div>
            <div className="plan-meta">~ 24 € · facturable mensuellement.</div>
            <div className="plan-divider" />
            <ul className="plan-feat-list">
              <li>
                <Check /> Générations illimitées
              </li>
              <li>
                <Check /> Hébergement ZeroAPI · 3 projets
              </li>
              <li>
                <Check /> Domaines personnalisés
              </li>
              <li>
                <Check /> Webhooks · notifications push
              </li>
              <li>
                <Check /> Support sous 24 h
              </li>
            </ul>
            <Link href="/register?plan=pro" className="btn btn-accent">
              Passer Pro
            </Link>
          </Reveal>

          <Reveal as="div" className="plan" delay={200}>
            <div className="plan-name">Business</div>
            <div className="plan-tag">Pour les équipes et agences.</div>
            <div className="plan-price">
              75 000<small>FCFA / mois</small>
            </div>
            <div className="plan-meta">~ 120 € · jusqu&apos;à 10 sièges.</div>
            <div className="plan-divider" />
            <ul className="plan-feat-list">
              <li>
                <Check /> Tout Pro, sans limite
              </li>
              <li>
                <Check /> Projets illimités
              </li>
              <li>
                <Check /> SSO · audit log · SLA 99,9 %
              </li>
              <li>
                <Check /> Hébergement dédié sur demande
              </li>
              <li>
                <Check /> Onboarding 1-à-1 · support Slack
              </li>
            </ul>
            <a href="mailto:ventes@zeroapi.io" className="btn btn-ghost">
              Contacter les ventes
            </a>
          </Reveal>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 32,
            fontSize: 13,
            color: "var(--muted)",
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          🟢 Bientôt — paiement Mobile Money : Orange Money, Wave, MTN MoMo, Moov Money
        </p>
      </div>
    </section>
  );
}
