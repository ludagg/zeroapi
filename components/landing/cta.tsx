import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";

export function CTA() {
  return (
    <section id="cta" style={{ paddingBottom: 40 }}>
      <div className="wrap">
        <Reveal as="div" className="cta-final">
          <h2 className="display">
            Ton prochain backend
            <br />
            <em>écrit lui-même</em>.
          </h2>
          <p>Lance ta première génération en moins de 60 secondes. Aucune carte requise.</p>
          <div className="hero-ctas">
            <Link href="/register" className="btn btn-accent btn-lg">
              Démarrer gratuitement
              <svg
                className="arrow"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <a href="mailto:bonjour@zeroapi.app" className="btn btn-ghost btn-lg">
              Parler à un humain
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
