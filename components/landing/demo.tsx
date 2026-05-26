"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/landing/reveal";

export function Demo() {
  const [p2, setP2] = useState(18);
  const [job1, setJob1] = useState<{ status: "queued" | "running"; time: string }>({
    status: "queued",
    time: "en file…",
  });

  useEffect(() => {
    let v = 18;
    const t = setInterval(() => {
      v = Math.min(v + Math.random() * 3.5 + 1, 96);
      if (v >= 95) v = 18;
      setP2(v);
    }, 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let q = 0;
    const t = setInterval(() => {
      q += 1;
      if (q % 18 === 5) {
        setJob1({ status: "running", time: "démarrage…" });
      } else if (q % 18 === 0) {
        setJob1({ status: "queued", time: "position 2 · ~30 s" });
      }
    }, 500);
    return () => clearInterval(t);
  }, []);

  const job2Time = `~${Math.max(8, Math.round(60 - p2 * 0.55))} s restantes`;

  return (
    <section id="demo" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <div className="demo-wrap">
          <Reveal as="div" className="demo-copy">
            <span className="kicker">
              <span className="dot" /> En direct
            </span>
            <h2 className="display">
              <em>Lance.</em>
              <br />
              Vis ta vie. Reviens.
            </h2>
            <p>
              Génération asynchrone signifie : ton ordi peut s&apos;éteindre, ton réseau
              peut tomber. Le job continue. Quand c&apos;est prêt, ZeroAPI te ping.
            </p>
            <ul>
              <li>
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
                <span>Suivi en temps réel des jobs en file, en cours et terminés.</span>
              </li>
              <li>
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
                <span>Notifications email, push web et webhook Slack/Discord.</span>
              </li>
              <li>
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
                <span>
                  Historique versionné — re-génère sur prompt amendé sans repartir de
                  zéro.
                </span>
              </li>
            </ul>
          </Reveal>

          <Reveal as="div" className="demo-window" delay={140}>
            <div className="demo-titlebar">
              <div className="lights">
                <i />
                <i />
                <i />
              </div>
              <span className="url">console.zeroapi.io / jobs</span>
            </div>
            <div className="demo-body">
              <div className="job">
                <div className="job-icon">🗓</div>
                <div className="job-main">
                  <div className="name">
                    api-reservations <code>v1</code>
                  </div>
                  <div className="meta">
                    <span>14 endpoints</span>
                    <span>·</span>
                    <span>{job1.time}</span>
                  </div>
                  <div className="job-progress">
                    <div className="fill" style={{ width: "0%" }} />
                  </div>
                </div>
                <span className={`job-status ${job1.status}`}>
                  <span className="dot" />{" "}
                  {job1.status === "running" ? "EN COURS" : "EN FILE"}
                </span>
              </div>

              <div className="job">
                <div className="job-icon">💬</div>
                <div className="job-main">
                  <div className="name">
                    chat-rooms-api <code>v2</code>
                  </div>
                  <div className="meta">
                    <span>22 endpoints</span>
                    <span>·</span>
                    <span>{job2Time}</span>
                  </div>
                  <div className="job-progress">
                    <div className="fill" style={{ width: `${p2}%` }} />
                  </div>
                </div>
                <span className="job-status running">
                  <span className="dot" /> EN COURS
                </span>
              </div>

              <div className="job">
                <div className="job-icon">🛒</div>
                <div className="job-main">
                  <div className="name">
                    e-commerce-mobile-money <code>v1</code>
                  </div>
                  <div className="meta">
                    <span>31 endpoints</span>
                    <span>·</span>
                    <span>terminé · il y a 12 s</span>
                  </div>
                  <div className="job-progress">
                    <div className="fill" style={{ width: "100%" }} />
                  </div>
                </div>
                <span className="job-status ready">
                  <span className="dot" /> PRÊT
                </span>
              </div>

              <div className="demo-notif">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
                <div>
                  <b>e-commerce-mobile-money</b> est prêt —{" "}
                  <span className="pill">déployer</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
