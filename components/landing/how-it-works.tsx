"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/landing/reveal";

const LINES = [
  { t: "> décris ton API\n", c: "muted" },
  { t: "Backend pour une app de transport\n", c: "ink" },
  { t: "interurbain en Côte d'Ivoire :\n", c: "ink" },
  { t: "users, trajets, sièges, paiements\n", c: "ink" },
  { t: "Wave + Orange Money, RBAC chauffeur/admin", c: "ink" },
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
            Trois étapes. <em>Zéro</em> code à écrire.
          </h2>
          <p>
            Tu décris ce que tu veux. ZeroAPI réfléchit pendant que tu fais autre chose.
            Tu déploies quand c&apos;est prêt.
          </p>
        </Reveal>

        <div className="steps">
          <Reveal as="div" className="step" delay={0}>
            <div className="step-num">
              <b>01</b> · Décris
            </div>
            <h3>
              Ton API,
              <br />
              en une phrase.
            </h3>
            <p>
              Français ou anglais. Modèles, relations, règles métier. ZeroAPI comprend
              le langage humain — y compris le pidgin.
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
              <b>02</b> · ZeroAPI génère
            </div>
            <h3>
              Ferme l&apos;onglet.
              <br />
              On te prévient.
            </h3>
            <p>
              Génération en arrière-plan : spec, code Hono.js, tests, docs OpenAPI. Tu
              reçois un email — ou une notif push — quand c&apos;est prêt.
            </p>
            <div className="step-visual step-visual-2">
              <div className="ring" />
              <div className="center">~ 2 min</div>
              <div className="badges">
                <span className="badge">spec</span>
                <span className="badge">routes</span>
                <span className="badge">tests</span>
                <span className="badge">docs</span>
              </div>
            </div>
          </Reveal>

          <Reveal as="div" className="step" delay={240}>
            <div className="step-num">
              <b>03</b> · Déploie
            </div>
            <h3>
              En un clic,
              <br />
              partout.
            </h3>
            <p>
              Railway, Render, Vercel, Fly.io — ou exporte le repo Git et fais ce que tu
              veux. Ton code, ta liberté.
            </p>
            <div className="step-visual step-visual-3">
              <div className="target">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                </svg>
                railway.app
                <span className="status" />
              </div>
              <div className="target dim">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                </svg>
                render.com
                <span className="status" />
              </div>
              <div className="target dim">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 20L12 4l8 16z" />
                </svg>
                vercel.com
                <span className="status" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
