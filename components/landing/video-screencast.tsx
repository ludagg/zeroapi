"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/landing/reveal";

type Scene = {
  label: string;
  duration: number;
};

const PROMPT_LINES = [
  "> décris ton API",
  "Backend pour une app de réservation",
  "interurbain en Côte d'Ivoire.",
  "users · trajets · sièges · paiements",
  "Wave + Orange Money · RBAC chauffeur/admin",
];

function PromptScene({ playing }: { playing: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!playing) return;
    setStep(0);
    const ids: ReturnType<typeof setTimeout>[] = [];
    PROMPT_LINES.forEach((_, i) => {
      ids.push(setTimeout(() => setStep(i + 1), 420 + i * 540));
    });
    return () => ids.forEach(clearTimeout);
  }, [playing]);

  return (
    <div className="vs-scene vs-scene-prompt">
      <div className="vs-prompt-shell">
        <div className="vs-prompt-bar">
          <span className="vs-pill">/generate</span>
          <span className="vs-pill faint">▾ Hono.js</span>
          <span className="vs-pill faint">▾ Postgres</span>
        </div>
        <div className="vs-prompt-body">
          {PROMPT_LINES.map((line, i) => (
            <div
              key={i}
              className={`vs-prompt-line${i === 0 ? " head" : ""}${
                i < step ? " in" : ""
              }`}
            >
              {line}
            </div>
          ))}
          <div className="vs-prompt-cursor" />
        </div>
        <div className="vs-prompt-foot">
          <span className="vs-shortcut">⌘ ↵</span>
          <span className="vs-prompt-submit">Lancer la génération</span>
        </div>
      </div>
    </div>
  );
}

function GeneratingScene({ playing }: { playing: boolean }) {
  const [pct, setPct] = useState(8);
  const [stepIdx, setStepIdx] = useState(0);

  const STEPS = [
    "Analyse du prompt",
    "Génération du schéma Prisma",
    "Routes Hono.js",
    "Tests Vitest",
    "Docs OpenAPI 3.1",
  ];

  useEffect(() => {
    if (!playing) return;
    setPct(8);
    setStepIdx(0);
    const t = setInterval(() => {
      setPct((p) => {
        const next = Math.min(p + Math.random() * 6 + 4, 100);
        if (next > 96) {
          clearInterval(t);
          return 100;
        }
        return next;
      });
    }, 360);
    const t2 = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    }, 520);
    return () => {
      clearInterval(t);
      clearInterval(t2);
    };
  }, [playing]);

  return (
    <div className="vs-scene vs-scene-generating">
      <div className="vs-gen-head">
        <div className="vs-gen-ring">
          <div className="vs-gen-ring-track" />
          <div className="vs-gen-ring-fill" />
          <div className="vs-gen-ring-center">{Math.round(pct)}%</div>
        </div>
        <div className="vs-gen-meta">
          <div className="vs-gen-title">api-reservations · v1</div>
          <div className="vs-gen-sub">14 endpoints · ~2 min</div>
          <div className="vs-gen-bar">
            <div className="vs-gen-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <ul className="vs-gen-steps">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`vs-gen-step${i < stepIdx ? " done" : ""}${
              i === stepIdx ? " active" : ""
            }`}
          >
            <span className="vs-gen-step-dot" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeployScene({ playing }: { playing: boolean }) {
  const [phase, setPhase] = useState<"ready" | "deploying" | "live">("ready");

  useEffect(() => {
    if (!playing) return;
    setPhase("ready");
    const t1 = setTimeout(() => setPhase("deploying"), 700);
    const t2 = setTimeout(() => setPhase("live"), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [playing]);

  return (
    <div className="vs-scene vs-scene-deploy">
      <div className="vs-deploy-card">
        <div className="vs-deploy-row">
          <span className="vs-deploy-icon">▣</span>
          <div className="vs-deploy-main">
            <div className="vs-deploy-name">api-reservations</div>
            <div className="vs-deploy-url">
              {phase === "live"
                ? "https://api-reservations.zeroapi.app"
                : "—"}
            </div>
          </div>
          <span className={`vs-deploy-status ${phase}`}>
            <span className="vs-deploy-status-dot" />
            {phase === "ready" && "PRÊT"}
            {phase === "deploying" && "DÉPLOIE…"}
            {phase === "live" && "EN LIGNE"}
          </span>
        </div>
        <div className="vs-deploy-targets">
          <span className="vs-deploy-target on">Railway</span>
          <span className="vs-deploy-target">Fly.io</span>
          <span className="vs-deploy-target">Render</span>
          <span className="vs-deploy-target">Vercel</span>
        </div>
      </div>
      <div className={`vs-deploy-curl${phase === "live" ? " in" : ""}`}>
        <span className="vs-curl-prompt">$</span>{" "}
        <span className="vs-curl-cmd">
          curl https://api-reservations.zeroapi.app/trajets
        </span>
        <div className="vs-curl-out">
          <span className="vs-curl-line">HTTP/2 200</span>
          <span className="vs-curl-line">content-type: application/json</span>
          <span className="vs-curl-line">
            {`{ "data": [ { "id": "tr_01", "from": "Abidjan", "to": "Yamoussoukro" } ] }`}
          </span>
        </div>
      </div>
    </div>
  );
}

const SCENES: Scene[] = [
  { label: "01 · Décris", duration: 4200 },
  { label: "02 · Génère", duration: 5200 },
  { label: "03 · Déploie", duration: 4600 },
];

export function VideoScreencast() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    startRef.current = performance.now();
    const duration = SCENES[active].duration;
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const p = Math.min(elapsed / duration, 1);
      if (!cancelled) setProgress(p);
      if (p >= 1) {
        setActive((a) => (a + 1) % SCENES.length);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, playing]);

  const totalProgress =
    (SCENES.slice(0, active).reduce((a, s) => a + s.duration, 0) +
      progress * SCENES[active].duration) /
    SCENES.reduce((a, s) => a + s.duration, 0);

  const fmt = (frac: number) => {
    const total = 134;
    const s = Math.floor(frac * total);
    return `${String(Math.floor(s / 60)).padStart(1, "0")}:${String(s % 60).padStart(
      2,
      "0",
    )}`;
  };

  return (
    <section id="screencast" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">
            <span className="dot" /> Démo
          </span>
          <h2 className="display">
            Regarde-le. <em>Soixante secondes.</em>
          </h2>
          <p>
            Du prompt à l&apos;API en ligne. Zéro coupure, zéro montage trompeur — c&apos;est
            l&apos;outil tel qu&apos;il tourne aujourd&apos;hui.
          </p>
        </Reveal>

        <Reveal as="div" className="vs-card" delay={80}>
          <div className="vs-frame">
            <div className="vs-titlebar">
              <div className="vs-lights">
                <i />
                <i />
                <i />
              </div>
              <span className="vs-url">
                console.zeroapi.app
                <span className="vs-url-path">/generate</span>
              </span>
              <span className="vs-rec">
                <span className="vs-rec-dot" /> REC
              </span>
            </div>
            <div className="vs-stage">
              <div className={`vs-stage-track scene-${active}`}>
                <div className="vs-stage-slot">
                  <PromptScene playing={playing && active === 0} />
                </div>
                <div className="vs-stage-slot">
                  <GeneratingScene playing={playing && active === 1} />
                </div>
                <div className="vs-stage-slot">
                  <DeployScene playing={playing && active === 2} />
                </div>
              </div>
            </div>

            <div className="vs-controls">
              <button
                type="button"
                className="vs-play"
                aria-label={playing ? "Pause" : "Lecture"}
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M7 4v16l13-8z" />
                  </svg>
                )}
              </button>
              <div className="vs-time">{fmt(totalProgress)}</div>
              <div className="vs-progress">
                <div
                  className="vs-progress-fill"
                  style={{ width: `${totalProgress * 100}%` }}
                />
                {SCENES.map((_, i) => {
                  const stops =
                    SCENES.slice(0, i + 1).reduce((a, s) => a + s.duration, 0) /
                    SCENES.reduce((a, s) => a + s.duration, 0);
                  if (i === SCENES.length - 1) return null;
                  return (
                    <span
                      key={i}
                      className="vs-progress-mark"
                      style={{ left: `${stops * 100}%` }}
                      aria-hidden
                    />
                  );
                })}
              </div>
              <div className="vs-time vs-time-total">2:14</div>
              <button
                type="button"
                className="vs-mute"
                aria-label="Sourdine"
                title="Sourdine"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </svg>
              </button>
            </div>
          </div>

          <div className="vs-chapters">
            {SCENES.map((s, i) => (
              <button
                key={s.label}
                type="button"
                className={`vs-chapter${i === active ? " active" : ""}`}
                onClick={() => {
                  setActive(i);
                  setProgress(0);
                  startRef.current = performance.now();
                }}
              >
                <span className="vs-chapter-num">{s.label.split(" · ")[0]}</span>
                <span className="vs-chapter-name">{s.label.split(" · ")[1]}</span>
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
