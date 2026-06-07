"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/reveal";

const SCENE_DURATIONS = [5200, 5200, 4600];

function PromptScene({ playing }: { playing: boolean }) {
  const t = useTranslations("landing.screencast");
  const lines = t.raw("promptLines") as string[];
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!playing) return;
    setStep(0);
    const ids: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((_, i) => {
      ids.push(setTimeout(() => setStep(i + 1), 420 + i * 540));
    });
    return () => ids.forEach(clearTimeout);
  }, [playing, lines]);

  return (
    <div className="vs-scene vs-scene-prompt">
      <div className="vs-prompt-shell">
        <div className="vs-prompt-bar">
          <span className="vs-pill">{t("promptBar")}</span>
          <span className="vs-pill faint">▾ Hono.js</span>
          <span className="vs-pill faint">▾ Postgres</span>
        </div>
        <div className="vs-prompt-body">
          {lines.map((line, i) => (
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
          <span className="vs-prompt-submit">{t("submit")}</span>
        </div>
      </div>
    </div>
  );
}

function GeneratingScene({ playing }: { playing: boolean }) {
  const t = useTranslations("landing.screencast");
  const [pct, setPct] = useState(8);
  const [stepIdx, setStepIdx] = useState(0);

  const STEPS = [
    t("genSteps.validate"),
    t("genSteps.prisma"),
    t("genSteps.routes"),
    t("genSteps.tests"),
    t("genSteps.docs"),
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
  }, [playing, STEPS.length]);

  return (
    <div className="vs-scene vs-scene-generating">
      <div className="vs-gen-head">
        <div className="vs-gen-ring">
          <div className="vs-gen-ring-track" />
          <div className="vs-gen-ring-fill" />
          <div className="vs-gen-ring-center">{Math.round(pct)}%</div>
        </div>
        <div className="vs-gen-meta">
          <div className="vs-gen-title">{t("genTitle")}</div>
          <div className="vs-gen-sub">{t("genSub")}</div>
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
  const t = useTranslations("landing.screencast");
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
              {phase === "live" ? "https://api-reservations.zeroapi.app" : "—"}
            </div>
          </div>
          <span className={`vs-deploy-status ${phase}`}>
            <span className="vs-deploy-status-dot" />
            {phase === "ready" && t("deploy.ready")}
            {phase === "deploying" && t("deploy.deploying")}
            {phase === "live" && t("deploy.live")}
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

export function VideoScreencast() {
  const t = useTranslations("landing.screencast");
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const chapters = [t("chapterDiscuss"), t("chapterGenerate"), t("chapterDeploy")];

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    startRef.current = performance.now();
    const duration = SCENE_DURATIONS[active];
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const p = Math.min(elapsed / duration, 1);
      if (!cancelled) setProgress(p);
      if (p >= 1) {
        setActive((a) => (a + 1) % SCENE_DURATIONS.length);
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
    (SCENE_DURATIONS.slice(0, active).reduce((a, s) => a + s, 0) +
      progress * SCENE_DURATIONS[active]) /
    SCENE_DURATIONS.reduce((a, s) => a + s, 0);

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
            <span className="dot" /> {t("kicker")}
          </span>
          <h2 className="display">
            {t("headlineLead")} <em>{t("headlineAccent")}</em>
          </h2>
          <p>{t("sub")}</p>
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
                aria-label={playing ? "Pause" : "Play"}
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
                {SCENE_DURATIONS.map((_, i) => {
                  const stops =
                    SCENE_DURATIONS.slice(0, i + 1).reduce((a, s) => a + s, 0) /
                    SCENE_DURATIONS.reduce((a, s) => a + s, 0);
                  if (i === SCENE_DURATIONS.length - 1) return null;
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
              <button type="button" className="vs-mute" aria-label="Mute" title="Mute">
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
            {chapters.map((label, i) => (
              <button
                key={label}
                type="button"
                className={`vs-chapter${i === active ? " active" : ""}`}
                onClick={() => {
                  setActive(i);
                  setProgress(0);
                  startRef.current = performance.now();
                }}
              >
                <span className="vs-chapter-num">{`0${i + 1}`}</span>
                <span className="vs-chapter-name">{label}</span>
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
