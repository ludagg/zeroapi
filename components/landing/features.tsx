import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/reveal";

export function Features() {
  const t = useTranslations("landing.features");
  return (
    <section id="usages" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">{t("kicker")}</span>
          <h2 className="display">
            {t("headlineLead")}
            <br />
            <em>{t("headlineAccent")}</em>
          </h2>
          <p>{t("sub")}</p>
        </Reveal>

        <div className="features">
          <Reveal as="div" className="feat wide" delay={0}>
            <span className="feat-tag">{t("core.tag")}</span>
            <div className="feat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <ellipse cx="12" cy="5" rx="8" ry="3" />
                <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
              </svg>
            </div>
            <h3>{t("core.title")}</h3>
            <p>{t("core.body")}</p>
            <div className="mini-code">
              <span className="ln">
                <span className="c">// auto-généré</span>
              </span>
              <span className="ln">
                <span className="k">app</span>.<span className="v">get</span>(
                <span className="s">&quot;/orders&quot;</span>,{" "}
                <span className="v">filter</span>(
                <span className="s">&quot;status,createdAt&quot;</span>),
              </span>
              <span className="ln">
                {"  "}
                <span className="v">sort</span>(
                <span className="s">&quot;-createdAt&quot;</span>),{" "}
                <span className="v">paginate</span>({"{"} cursor:{" "}
                <span className="s">&quot;id&quot;</span> {"}"}),
              </span>
              <span className="ln">
                {"  "}
                <span className="v">withRole</span>(
                <span className="s">&quot;admin&quot;</span>),{" "}
                <span className="v">listOrders</span>);
              </span>
            </div>
          </Reveal>

          <Reveal as="div" className="feat wide" delay={80}>
            <span
              className="feat-tag"
              style={{ background: "var(--ink)", color: "var(--bg)" }}
            >
              {t("security.tag")}
            </span>
            <div className="feat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6l9-4z" />
              </svg>
            </div>
            <h3>{t("security.title")}</h3>
            <p>{t("security.body")}</p>
            <div className="mini-code">
              <span className="ln">
                <span className="k">app</span>.<span className="v">use</span>(
                <span className="v">helmet</span>(), <span className="v">cors</span>(),{" "}
                <span className="v">rateLimit</span>({"{"} <span className="k">rpm</span>
                : <span className="s">120</span> {"}"}));
              </span>
              <span className="ln">
                <span className="k">app</span>.<span className="v">use</span>(
                <span className="s">&quot;/admin/*&quot;</span>,{" "}
                <span className="v">auth</span>.<span className="v">jwt</span>(),{" "}
                <span className="v">requireRole</span>(
                <span className="s">&quot;admin&quot;</span>));
              </span>
              <span className="ln">
                <span className="c">// CSRF, XSS, SQLi → vérifiés ✓</span>
              </span>
            </div>
          </Reveal>

          <Reveal as="div" className="feat" delay={0}>
            <div className="feat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3>{t("conversational.title")}</h3>
            <p>{t("conversational.body")}</p>
          </Reveal>

          <Reveal as="div" className="feat" delay={80}>
            <div className="feat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
              </svg>
            </div>
            <h3>{t("multiAI.title")}</h3>
            <p>{t("multiAI.body")}</p>
          </Reveal>

          <Reveal as="div" className="feat" delay={160}>
            <div className="feat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
              </svg>
            </div>
            <h3>{t("devMode.title")}</h3>
            <p>{t("devMode.body")}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
