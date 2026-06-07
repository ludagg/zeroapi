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
            <em>Monte</em> en puissance.
          </h2>
          <p>
            Chaque plan ouvre un quota de générations par mois. L&apos;export du code et le
            Dev Mode sont inclus partout — même en gratuit. Pas de vendor-lock, jamais.
          </p>
        </Reveal>

        <div className="plans">
          <Reveal as="div" className="plan" delay={0}>
            <div className="plan-name">Free</div>
            <div className="plan-tag">Pour explorer et apprendre.</div>
            <div className="plan-price">
              0<small>€ / mois</small>
            </div>
            <div className="plan-meta">Pour toujours.</div>
            <div className="plan-divider" />
            <ul className="plan-feat-list">
              <li>
                <Check /> 3 générations / mois
              </li>
              <li>
                <Check /> IA Mistral &amp; Gemini
              </li>
              <li>
                <Check /> Export Git + Dev Mode
              </li>
              <li>
                <Check /> Marketplace en lecture
              </li>
              <li className="dim">
                <Cross /> Hébergement ZeroAPI Cloud
              </li>
            </ul>
            <Link href="/register" className="btn btn-ghost">
              Commencer
            </Link>
          </Reveal>

          <Reveal as="div" className="plan" delay={80}>
            <div className="plan-name">Starter</div>
            <div className="plan-tag">Pour les projets perso sérieux.</div>
            <div className="plan-price">
              19<small>€ / mois</small>
            </div>
            <div className="plan-meta">~ 12 500 FCFA · mensuel.</div>
            <div className="plan-divider" />
            <ul className="plan-feat-list">
              <li>
                <Check /> 30 générations / mois
              </li>
              <li>
                <Check /> ZeroAPI Cloud · 1 projet
              </li>
              <li>
                <Check /> Playground &amp; partage public
              </li>
              <li>
                <Check /> Publication de templates
              </li>
              <li>
                <Check /> Support email
              </li>
            </ul>
            <Link href="/register?plan=starter" className="btn btn-ghost">
              Choisir Starter
            </Link>
          </Reveal>

          <Reveal as="div" className="plan featured" delay={160}>
            <span className="plan-badge">★ Populaire</span>
            <div className="plan-name">Pro</div>
            <div className="plan-tag">Pour les builders sérieux.</div>
            <div className="plan-price">
              49<small>€ / mois</small>
            </div>
            <div className="plan-meta">~ 32 000 FCFA · mensuel.</div>
            <div className="plan-divider" />
            <ul className="plan-feat-list">
              <li>
                <Check /> 150 générations / mois
              </li>
              <li>
                <Check /> IA Claude premium
              </li>
              <li>
                <Check /> ZeroAPI Cloud · 3 projets
              </li>
              <li>
                <Check /> Domaines perso · webhooks · push
              </li>
              <li>
                <Check /> Support sous 24 h
              </li>
            </ul>
            <Link href="/register?plan=pro" className="btn btn-accent">
              Passer Pro
            </Link>
          </Reveal>

          <Reveal as="div" className="plan" delay={240}>
            <div className="plan-name">Business</div>
            <div className="plan-tag">Pour les équipes et agences.</div>
            <div className="plan-price">
              199<small>€ / mois</small>
            </div>
            <div className="plan-meta">~ 130 000 FCFA · jusqu&apos;à 10 sièges.</div>
            <div className="plan-divider" />
            <ul className="plan-feat-list">
              <li>
                <Check /> 1 000 générations / mois
              </li>
              <li>
                <Check /> Projets &amp; membres illimités
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
            <a href="mailto:ventes@zeroapi.app" className="btn btn-ghost">
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
