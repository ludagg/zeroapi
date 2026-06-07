"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/landing/reveal";

const LINES = [
  { t: "Kia › Qui gère les stocks : un seul\n", c: "muted" },
  { t: "admin, ou un rôle par entrepôt ?\n", c: "muted" },
  { t: "Toi › Un rôle par entrepôt, et un\n", c: "ink" },
  { t: "super-admin qui voit tout.\n", c: "ink" },
  { t: "Kia › Noté. RBAC à 2 niveaux ✓", c: "muted" },
];

function useStepTypewriter() {
  const [buf, setBuf] = useState("");
  const stateRef = useRef({ li: 0, ci: 0, buf: "" });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const s = stateRef.current;
      if (s.li >= LINES.length) {
        timer = setTimeout(() => {
          s.buf = "";
          s.li = 0;
          s.ci = 0;
          setBuf("");
          tick();
        }, 3500);
        return;
      }
      const line = LINES[s.li];
      if (s.ci < line.t.length) {
        s.buf += line.t[s.ci];
        s.ci += 1;
        setBuf(s.buf);
        timer = setTimeout(tick, 18 + Math.random() * 30);
      } else {
        s.li += 1;
        s.ci = 0;
        timer = setTimeout(tick, 120);
      }
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, []);

  return buf;
}

export function HowItWorks() {
  const typed = useStepTypewriter();

  return (
    <section id="produit">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">Comment ça marche</span>
          <h2 className="display">
            Une conversation. <em>Un backend</em> complet.
          </h2>
          <p>
            Pas de formulaire, pas de schéma à dessiner. Tu discutes avec Kia, la spec se
            construit sous tes yeux, et tu déploies quand tu es prêt.
          </p>
        </Reveal>

        <div className="steps">
          <Reveal as="div" className="step" delay={0}>
            <div className="step-num">
              <b>01</b> · Discute
            </div>
            <h3>
              Décris ton produit,
              <br />
              pas ta base de données.
            </h3>
            <p>
              Français, anglais ou pidgin. Kia pose les bonnes questions — rôles,
              relations, règles métier — et écrit la spec ressource par ressource, en
              direct dans le chat.
            </p>
            <div className="step-visual step-visual-1">
              <div className="typed">
                {typed}
                <span className="cursor" />
              </div>
            </div>
          </Reveal>

          <Reveal as="div" className="step" delay={120}>
            <span className="async-note">⏱ asynchrone</span>
            <div className="step-num">
              <b>02</b> · Génère
            </div>
            <h3>
              Lance, puis
              <br />
              ferme l&apos;onglet.
            </h3>
            <p>
              Multi-IA (Claude, Mistral, Gemini) génère spec, code Hono.js, tests et docs
              OpenAPI en arrière-plan. Tu reçois une notif — email, push ou Slack — quand
              c&apos;est prêt.
            </p>
            <div className="step-visual step-visual-2">
              <div className="ring" />
              <div className="center">~ 2 min</div>
              <div className="badges">
                <span className="badge">spec</span>
                <span className="badge">routes</span>
                <span className="badge">tests</span>
                <span className="badge">SDK</span>
              </div>
            </div>
          </Reveal>

          <Reveal as="div" className="step" delay={240}>
            <div className="step-num">
              <b>03</b> · Teste &amp; déploie
            </div>
            <h3>
              Playground intégré,
              <br />
              puis en ligne.
            </h3>
            <p>
              Teste chaque endpoint dans le navigateur. Déploie sur ZeroAPI Cloud en un
              clic — ou exporte le repo Git vers Railway, Render, Vercel, Fly.io. Ton
              code, ta liberté.
            </p>
            <div className="step-visual step-visual-3">
              <div className="target">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                ZeroAPI Cloud
                <span className="status" />
              </div>
              <div className="target dim">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                </svg>
                railway.app
                <span className="status" />
              </div>
              <div className="target dim">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 20L12 4l8 16z" />
                </svg>
                git export
                <span className="status" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
