"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/landing/reveal";

const ENDPOINTS = [
  { method: "GET", path: "/trajets" },
  { method: "POST", path: "/reservations" },
  { method: "GET", path: "/trajets/:id/sieges" },
  { method: "POST", path: "/paiements/wave" },
] as const;

const RESPONSE = `{
  "data": [
    {
      "id": "tr_01H",
      "from": "Abidjan",
      "to": "Yamoussoukro",
      "depart": "2026-06-08T07:30:00Z",
      "sieges_libres": 11,
      "prix_fcfa": 4500
    }
  ],
  "meta": { "total": 1, "next": null }
}`;

export function Playground() {
  const [active, setActive] = useState(0);
  const [elapsed, setElapsed] = useState(42);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((a) => (a + 1) % ENDPOINTS.length);
      setElapsed(28 + Math.round(Math.random() * 40));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="playground" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <div className="demo-wrap">
          <Reveal as="div" className="demo-copy">
            <span className="kicker">
              <span className="dot" /> Playground
            </span>
            <h2 className="display">
              <em>Teste</em> avant
              <br />
              de déployer.
            </h2>
            <p>
              Un client HTTP intégré, directement dans ZeroAPI. Choisis un endpoint,
              ajuste les paramètres, envoie une vraie requête — et lis la réponse, les
              en-têtes et le temps de réponse sans quitter le navigateur.
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
                <span>Tous les endpoints détectés depuis ta spec, prêts à l&apos;emploi.</span>
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
                <span>Params, body JSON et en-têtes éditables — auth gérée pour toi.</span>
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
                <span>Status, latence et payload formatés, comme dans Postman.</span>
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
              <span className="url">console.zeroapi.app / playground</span>
            </div>
            <div className="pg-body">
              <div className="pg-endpoints">
                {ENDPOINTS.map((e, i) => (
                  <button
                    key={e.path}
                    type="button"
                    className={`pg-endpoint${i === active ? " active" : ""}`}
                    onClick={() => setActive(i)}
                  >
                    <span className={`pg-method ${e.method.toLowerCase()}`}>{e.method}</span>
                    <span className="pg-path">{e.path}</span>
                  </button>
                ))}
              </div>
              <div className="pg-request">
                <span className={`pg-method ${ENDPOINTS[active].method.toLowerCase()}`}>
                  {ENDPOINTS[active].method}
                </span>
                <span className="pg-url">
                  api-reservations.zeroapi.app{ENDPOINTS[active].path}
                </span>
                <span className="pg-send">Envoyer</span>
              </div>
              <div className="pg-response">
                <div className="pg-response-head">
                  <span className="pg-status">200 OK</span>
                  <span className="pg-time">{elapsed} ms</span>
                  <span className="pg-type">application/json</span>
                </div>
                <pre className="pg-json">{RESPONSE}</pre>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
