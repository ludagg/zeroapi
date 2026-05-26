"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const PROMPTS = [
  "API de réservations pour un centre médical : patients, médecins, créneaux, rappels SMS.",
  "Plateforme e-commerce avec panier persistant, paiement Mobile Money et gestion des stocks multi-entrepôts.",
  "Backend pour app de livraison : commandes, livreurs en temps réel, calcul d'itinéraires et notes.",
  "API SaaS multi-tenant avec abonnements, facturation au prorata et webhooks Stripe.",
];

function useTypewriter() {
  const [text, setText] = useState("");
  const stateRef = useRef({ pi: 0, ci: 0, deleting: false });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const s = stateRef.current;
      const full = PROMPTS[s.pi];
      if (!s.deleting) {
        s.ci += 1;
        setText(full.slice(0, s.ci));
        if (s.ci === full.length) {
          s.deleting = true;
          timer = setTimeout(tick, 2400);
          return;
        }
        timer = setTimeout(tick, 22 + Math.random() * 28);
      } else {
        s.ci -= 3;
        if (s.ci <= 0) {
          s.ci = 0;
          s.deleting = false;
          s.pi = (s.pi + 1) % PROMPTS.length;
          timer = setTimeout(tick, 320);
          return;
        }
        setText(full.slice(0, s.ci));
        timer = setTimeout(tick, 10);
      }
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, []);

  return text;
}

export function Hero() {
  const typed = useTypewriter();

  return (
    <section className="hero" id="hero">
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="wrap hero-inner">
        <span className="kicker">
          <span className="dot" />
          Génération asynchrone · Hono.js
        </span>
        <h1 className="display">
          Décris ton backend.
          <br />
          <em>Reviens</em> quand il est{" "}
          <span className="accent-word">prêt</span>.
        </h1>
        <p className="lede">
          ZeroAPI transforme une description en français — ou en anglais — en une API
          Hono.js complète : sécurisée, testée, documentée. Tu lances le job, tu fermes
          l&apos;onglet. On te prévient.
        </p>

        <div className="prompt-card" role="textbox" aria-label="Décrivez votre API">
          <div className="prompt-head">
            <div className="lights">
              <i />
              <i />
              <i />
            </div>
            <span>nouveau-projet · prompt.md</span>
          </div>
          <div className="prompt-body">
            <div className="prompt-icon">›_</div>
            <div className="prompt-text">
              <span>{typed}</span>
              <span className="prompt-cursor" />
            </div>
          </div>
          <div className="prompt-foot">
            <span className="hint">
              <kbd>⏎</kbd> pour générer · <kbd>⇧⏎</kbd> nouvelle ligne
            </span>
            <button className="submit" type="button">
              Générer
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

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
          <a href="#demo" className="btn btn-ghost btn-lg">
            Voir une démo
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </a>
        </div>

        <div className="hero-meta">
          <span>
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
            Pas de carte requise
          </span>
          <span>
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
            Code exportable
          </span>
          <span>
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
            Hébergé en Afrique de l&apos;Ouest
          </span>
        </div>

        <div className="flow" aria-label="Flux de génération">
          <div className="flow-node">
            <div className="label">01 · Prompt</div>
            <div className="body">
              <span className="k">›</span> <span className="v">API de réservations</span>
              {"\n"}
              <span className="k">›</span> tables :{" "}
              <span className="v">salles, créneaux, users</span>
              {"\n"}
              <span className="k">›</span> auth : <span className="g">JWT + RBAC</span>
            </div>
          </div>
          <div className="arrow-cell">
            <div className="arrow-line" />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
          <div className="flow-node">
            <div className="label">02 · Spec IA</div>
            <div className="body">
              <span className="k">&quot;models&quot;</span>: [{"\n"}
              {"  "}
              <span className="v">Salle</span>, <span className="v">Créneau</span>,{" "}
              <span className="v">User</span>
              {"\n"}],{"\n"}
              <span className="k">&quot;endpoints&quot;</span>:{" "}
              <span className="g">14</span>
              {"\n"}
              <span className="k">&quot;relations&quot;</span>:{" "}
              <span className="g">3</span>
            </div>
          </div>
          <div className="arrow-cell">
            <div className="arrow-line" />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
          <div className="flow-node">
            <div className="label">03 · API Hono.js</div>
            <div className="body">
              <span className="g">✓</span> <span className="v">routes générées</span>
              {"\n"}
              <span className="g">✓</span> <span className="v">tests · 94% couv.</span>
              {"\n"}
              <span className="g">✓</span> <span className="v">OpenAPI 3.1</span>
              {"\n"}
              <span className="g">✓</span> <span className="v">prêt à déployer</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
