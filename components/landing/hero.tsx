"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Scripted conversation between the user and Kia, ZeroAPI's spec architect.
 *  The thread plays once, building a live spec panel as it goes — mirroring
 *  the real /generate experience. */
type Step =
  | { kind: "user"; text: string }
  | { kind: "kia"; text: string; resources?: string[]; endpoints?: number };

const SCRIPT: Step[] = [
  {
    kind: "user",
    text: "API pour une app de réservation de bus interurbain en Côte d'Ivoire. Wave + Orange Money.",
  },
  {
    kind: "kia",
    text: "Compris. Je pars sur **Trajet**, **Siège**, **Réservation**, **Paiement** et **User**. Qui réserve : un compte client, ou aussi des guichets ?",
    resources: ["User", "Trajet", "Siège", "Réservation", "Paiement"],
    endpoints: 21,
  },
  { kind: "user", text: "Client + guichet. Et un rôle admin pour la compagnie." },
  {
    kind: "kia",
    text: "Parfait — RBAC **client / guichet / admin**, JWT, et webhooks Wave + Orange Money sur les paiements. La spec est prête. On lance ?",
    resources: ["User", "Trajet", "Siège", "Réservation", "Paiement"],
    endpoints: 24,
  },
];

function useScriptedChat() {
  const [visible, setVisible] = useState(0); // steps fully shown
  const [typed, setTyped] = useState(""); // currently-typing text
  const [done, setDone] = useState(false);
  const state = useRef({ step: 0, ci: 0 });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const s = state.current;
      if (s.step >= SCRIPT.length) {
        setDone(true);
        return;
      }
      const full = SCRIPT[s.step].text;
      if (s.ci < full.length) {
        s.ci += 1;
        setTyped(full.slice(0, s.ci));
        timer = setTimeout(tick, 14 + Math.random() * 22);
      } else {
        setVisible(s.step + 1);
        setTyped("");
        s.step += 1;
        s.ci = 0;
        timer = setTimeout(tick, 620);
      }
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, []);

  return { visible, typed, done };
}

function renderRich(text: string) {
  // bold **segments** only — lightweight, no markdown dep
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function Hero() {
  const { visible, typed, done } = useScriptedChat();

  // The live spec reflects the most recent Kia step that carries one.
  const lastSpec = [...SCRIPT.slice(0, visible)]
    .reverse()
    .find((s) => s.kind === "kia" && s.resources) as
    | Extract<Step, { kind: "kia" }>
    | undefined;
  const typingStep =
    visible < SCRIPT.length ? SCRIPT[visible] : undefined;

  return (
    <section className="hero" id="hero">
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="wrap hero-inner">
        <span className="kicker">
          <span className="dot" />
          Génération conversationnelle · multi-IA
        </span>
        <h1 className="display">
          Parle à <em>Kia</em>.
          <br />
          Ton backend <span className="accent-word">s&apos;écrit</span>.
        </h1>
        <p className="lede">
          ZeroAPI, c&apos;est une conversation avec Kia, ton architecte d&apos;API. Tu
          décris ton produit en français ou en anglais — elle pose les bonnes questions,
          construit la spec en direct, puis génère une API Hono.js complète : code,
          tests, docs, SDK.
        </p>

        <div className="chat-hero" aria-label="Conversation avec Kia">
          <div className="chat-hero-main">
            <div className="prompt-head">
              <div className="lights">
                <i />
                <i />
                <i />
              </div>
              <span>generate · conversation avec Kia</span>
            </div>
            <div className="chat-thread">
              {SCRIPT.slice(0, visible).map((s, i) => (
                <ChatBubble key={i} step={s} />
              ))}
              {typingStep && !done && (
                <ChatBubble step={typingStep} typed={typed} typing />
              )}
            </div>
            <div className="chat-composer">
              <span className="chat-composer-text">
                {done ? "Décris la suite, ou ajuste la spec…" : ""}
                <span className="prompt-cursor" />
              </span>
              <button className="submit" type="button" aria-hidden="true">
                {done ? "Lancer" : "Kia réfléchit…"}
                {done && (
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
                )}
              </button>
            </div>
          </div>

          <aside className="chat-spec" aria-label="Spec en direct">
            <div className="chat-spec-head">
              <span className="chat-spec-title">Spec en direct</span>
              <span className={`chat-spec-state${done ? " ready" : ""}`}>
                <span className="dot" />
                {done ? "PRÊTE" : "en cours"}
              </span>
            </div>
            <ul className="chat-spec-resources">
              {(lastSpec?.resources ?? []).map((r, i) => (
                <li key={r} style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="chat-spec-dot" />
                  {r}
                </li>
              ))}
              {!lastSpec && <li className="chat-spec-empty">en attente…</li>}
            </ul>
            <div className="chat-spec-foot">
              <div>
                <b>{lastSpec?.endpoints ?? 0}</b>
                <span>endpoints</span>
              </div>
              <div>
                <b>{lastSpec?.resources?.length ?? 0}</b>
                <span>modèles</span>
              </div>
              <div>
                <b>{done ? "JWT" : "—"}</b>
                <span>auth</span>
              </div>
            </div>
          </aside>
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
            Code 100 % exportable
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
      </div>
    </section>
  );
}

function ChatBubble({
  step,
  typed,
  typing = false,
}: {
  step: Step;
  typed?: string;
  typing?: boolean;
}) {
  const content = typing ? typed ?? "" : step.text;
  if (step.kind === "user") {
    return (
      <div className="chat-row user">
        <div className="chat-bubble user">{content}</div>
      </div>
    );
  }
  return (
    <div className="chat-row kia">
      <div className="chat-avatar" aria-hidden="true">
        K
      </div>
      <div className="chat-bubble kia">
        {renderRich(content)}
        {typing && <span className="prompt-cursor" />}
      </div>
    </div>
  );
}
