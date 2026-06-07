"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/** Scripted conversation between the user and Kia, ZeroAPI's spec architect.
 *  The thread plays once, building a live spec panel as it goes — mirroring
 *  the real /generate experience. */
type Step =
  | { kind: "user"; text: string }
  | { kind: "kia"; text: string; resources?: string[]; endpoints?: number };

function useScriptedChat(script: Step[]) {
  const [visible, setVisible] = useState(0); // steps fully shown
  const [typed, setTyped] = useState(""); // currently-typing text
  const [done, setDone] = useState(false);
  const state = useRef({ step: 0, ci: 0 });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const s = state.current;
      if (s.step >= script.length) {
        setDone(true);
        return;
      }
      const full = script[s.step].text;
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
  }, [script]);

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
  const t = useTranslations("landing.hero");
  const tc = useTranslations("common.actions");

  const script = useMemo<Step[]>(() => {
    const resources = t.raw("chat.resources") as string[];
    return [
      { kind: "user", text: t("chat.user1") },
      {
        kind: "kia",
        text: t("chat.kia1"),
        resources,
        endpoints: t.raw("chat.endpoints1") as number,
      },
      { kind: "user", text: t("chat.user2") },
      {
        kind: "kia",
        text: t("chat.kia2"),
        resources,
        endpoints: t.raw("chat.endpoints2") as number,
      },
    ];
  }, [t]);

  const { visible, typed, done } = useScriptedChat(script);

  // The live spec reflects the most recent Kia step that carries one.
  const lastSpec = [...script.slice(0, visible)]
    .reverse()
    .find((s) => s.kind === "kia" && s.resources) as
    | Extract<Step, { kind: "kia" }>
    | undefined;
  const typingStep = visible < script.length ? script[visible] : undefined;

  return (
    <section className="hero" id="hero">
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="wrap hero-inner">
        <span className="kicker">
          <span className="dot" />
          {t("kicker")}
        </span>
        <h1 className="display">
          {t("headlineLead")} <em>{t("headlineName")}</em>.
          <br />
          {t("headlineRest")} <span className="accent-word">{t("headlineAccent")}</span>.
        </h1>
        <p className="lede">{t("lede")}</p>

        <div className="chat-hero" aria-label={t("conversationLabel")}>
          <div className="chat-hero-main">
            <div className="prompt-head">
              <div className="lights">
                <i />
                <i />
                <i />
              </div>
              <span>{t("threadHeader")}</span>
            </div>
            <div className="chat-thread">
              {script.slice(0, visible).map((s, i) => (
                <ChatBubble key={i} step={s} />
              ))}
              {typingStep && !done && (
                <ChatBubble step={typingStep} typed={typed} typing />
              )}
            </div>
            <div className="chat-composer">
              <span className="chat-composer-text">
                {done ? t("composerDone") : ""}
                <span className="prompt-cursor" />
              </span>
              <button className="submit" type="button" aria-hidden="true">
                {done ? t("launch") : t("thinking")}
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

          <aside className="chat-spec" aria-label={t("specLabel")}>
            <div className="chat-spec-head">
              <span className="chat-spec-title">{t("specTitle")}</span>
              <span className={`chat-spec-state${done ? " ready" : ""}`}>
                <span className="dot" />
                {done ? t("specReady") : t("specPending")}
              </span>
            </div>
            <ul className="chat-spec-resources">
              {(lastSpec?.resources ?? []).map((r, i) => (
                <li key={r} style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="chat-spec-dot" />
                  {r}
                </li>
              ))}
              {!lastSpec && <li className="chat-spec-empty">{t("specWaiting")}</li>}
            </ul>
            <div className="chat-spec-foot">
              <div>
                <b>{lastSpec?.endpoints ?? 0}</b>
                <span>{t("specEndpoints")}</span>
              </div>
              <div>
                <b>{lastSpec?.resources?.length ?? 0}</b>
                <span>{t("specModels")}</span>
              </div>
              <div>
                <b>{done ? "JWT" : "—"}</b>
                <span>{t("specAuth")}</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="hero-ctas">
          <Link href="/register" className="btn btn-accent btn-lg">
            {tc("startFree")}
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
            {t("seeDemo")}
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
            {t("metaNoCard")}
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
            {t("metaExport")}
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
            {t("metaHosted")}
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
