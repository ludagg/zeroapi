"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/reveal";

export function Demo() {
  const t = useTranslations("landing.demo");
  const [p2, setP2] = useState(18);
  const [job1, setJob1] = useState<{ status: "queued" | "running"; time: string }>({
    status: "queued",
    time: t("queuedTime"),
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
    const timer = setInterval(() => {
      q += 1;
      if (q % 18 === 5) {
        setJob1({ status: "running", time: t("startingTime") });
      } else if (q % 18 === 0) {
        setJob1({ status: "queued", time: t("position") });
      }
    }, 500);
    return () => clearInterval(timer);
  }, [t]);

  const job2Time = t("remaining", { seconds: Math.max(8, Math.round(60 - p2 * 0.55)) });

  return (
    <section id="demo" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <div className="demo-wrap">
          <Reveal as="div" className="demo-copy">
            <span className="kicker">
              <span className="dot" /> {t("kicker")}
            </span>
            <h2 className="display">
              <em>{t("headlineAccent")}</em>
              <br />
              {t("headlineRest")}
            </h2>
            <p>{t("sub")}</p>
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
                <span>{t("bullet1")}</span>
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
                <span>{t("bullet2")}</span>
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
                <span>{t("bullet3")}</span>
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
              <span className="url">{t("url")}</span>
            </div>
            <div className="demo-body">
              <div className="job">
                <div className="job-icon">🗓</div>
                <div className="job-main">
                  <div className="name">
                    api-reservations <code>v1</code>
                  </div>
                  <div className="meta">
                    <span>{t("endpoints", { count: 14 })}</span>
                    <span>·</span>
                    <span>{job1.time}</span>
                  </div>
                  <div className="job-progress">
                    <div className="fill" style={{ width: "0%" }} />
                  </div>
                </div>
                <span className={`job-status ${job1.status}`}>
                  <span className="dot" />{" "}
                  {job1.status === "running" ? t("running") : t("queued")}
                </span>
              </div>

              <div className="job">
                <div className="job-icon">💬</div>
                <div className="job-main">
                  <div className="name">
                    chat-rooms-api <code>v2</code>
                  </div>
                  <div className="meta">
                    <span>{t("endpoints", { count: 22 })}</span>
                    <span>·</span>
                    <span>{job2Time}</span>
                  </div>
                  <div className="job-progress">
                    <div className="fill" style={{ width: `${p2}%` }} />
                  </div>
                </div>
                <span className="job-status running">
                  <span className="dot" /> {t("running")}
                </span>
              </div>

              <div className="job">
                <div className="job-icon">🛒</div>
                <div className="job-main">
                  <div className="name">
                    e-commerce-mobile-money <code>v1</code>
                  </div>
                  <div className="meta">
                    <span>{t("endpoints", { count: 31 })}</span>
                    <span>·</span>
                    <span>{t("doneAgo")}</span>
                  </div>
                  <div className="job-progress">
                    <div className="fill" style={{ width: "100%" }} />
                  </div>
                </div>
                <span className="job-status ready">
                  <span className="dot" /> {t("ready")}
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
                  <b>e-commerce-mobile-money</b> {t("notifReady")}{" "}
                  <span className="pill">{t("notifDeploy")}</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
