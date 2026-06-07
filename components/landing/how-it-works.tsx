"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/reveal";

function useStepTypewriter(lines: string[]) {
  const [buf, setBuf] = useState("");
  const stateRef = useRef({ li: 0, ci: 0, buf: "" });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const s = stateRef.current;
      if (s.li >= lines.length) {
        timer = setTimeout(() => {
          s.buf = "";
          s.li = 0;
          s.ci = 0;
          setBuf("");
          tick();
        }, 3500);
        return;
      }
      const line = lines[s.li];
      if (s.ci < line.length) {
        s.buf += line[s.ci];
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
  }, [lines]);

  return buf;
}

export function HowItWorks() {
  const t = useTranslations("landing.howItWorks");

  const lines = useMemo(
    () => [`${t("convo.kiaQ")}\n`, `${t("convo.userA")}\n`, t("convo.kiaOk")],
    [t],
  );
  const typed = useStepTypewriter(lines);

  return (
    <section id="produit">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">{t("kicker")}</span>
          <h2 className="display">
            {t("headlineLead")} <em>{t("headlineAccent")}</em> {t("headlineRest")}
          </h2>
          <p>{t("sub")}</p>
        </Reveal>

        <div className="steps">
          <Reveal as="div" className="step" delay={0}>
            <div className="step-num">
              <b>01</b> · {t("step1.num")}
            </div>
            <h3>{t("step1.title")}</h3>
            <p>{t("step1.body")}</p>
            <div className="step-visual step-visual-1">
              <div className="typed">
                {typed}
                <span className="cursor" />
              </div>
            </div>
          </Reveal>

          <Reveal as="div" className="step" delay={120}>
            <span className="async-note">{t("asyncNote")}</span>
            <div className="step-num">
              <b>02</b> · {t("step2.num")}
            </div>
            <h3>{t("step2.title")}</h3>
            <p>{t("step2.body")}</p>
            <div className="step-visual step-visual-2">
              <div className="ring" />
              <div className="center">{t("ringTime")}</div>
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
              <b>03</b> · {t("step3.num")}
            </div>
            <h3>{t("step3.title")}</h3>
            <p>{t("step3.body")}</p>
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
