import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/reveal";

function Yes({ label, strong = false }: { label: string; strong?: boolean }) {
  return (
    <span className={`cmp-cell yes${strong ? " strong" : ""}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <span className="sr">{label}</span>
    </span>
  );
}

function No({ label }: { label: string }) {
  return (
    <span className="cmp-cell no">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
      <span className="sr">{label}</span>
    </span>
  );
}

function Partial({ label }: { label: string }) {
  return <span className="cmp-cell partial">{label}</span>;
}

function Txt({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) {
  return <span className={`cmp-cell text${dim ? " dim" : ""}`}>{children}</span>;
}

export function Comparison() {
  const t = useTranslations("landing.comparison");
  const r = useTranslations("landing.comparison.rows");
  const yes = t("yes");
  const no = t("no");

  const rows: Array<{
    label: string;
    zeroapi: React.ReactNode;
    supabase: React.ReactNode;
    firebase: React.ReactNode;
  }> = [
    {
      label: r("approach"),
      zeroapi: <Txt>{r("approachZ")}</Txt>,
      supabase: <Txt dim>{r("approachS")}</Txt>,
      firebase: <Txt dim>{r("approachF")}</Txt>,
    },
    {
      label: r("conversational"),
      zeroapi: <Yes label={yes} strong />,
      supabase: <No label={no} />,
      firebase: <No label={no} />,
    },
    {
      label: r("sourceCode"),
      zeroapi: <Yes label={yes} strong />,
      supabase: <No label={no} />,
      firebase: <No label={no} />,
    },
    {
      label: r("marketplace"),
      zeroapi: <Yes label={yes} strong />,
      supabase: <No label={no} />,
      firebase: <No label={no} />,
    },
    {
      label: r("playground"),
      zeroapi: <Yes label={yes} />,
      supabase: <Partial label={r("playgroundS")} />,
      firebase: <Partial label={r("playgroundF")} />,
    },
    {
      label: r("noLock"),
      zeroapi: <Yes label={yes} strong />,
      supabase: <Partial label={r("lockPartial")} />,
      firebase: <No label={no} />,
    },
    {
      label: r("hosting"),
      zeroapi: <Yes label={yes} />,
      supabase: <Partial label={r("hostingS")} />,
      firebase: <No label={no} />,
    },
    {
      label: r("logic"),
      zeroapi: <Yes label={yes} />,
      supabase: <Partial label={r("logicS")} />,
      firebase: <Partial label={r("logicF")} />,
    },
    {
      label: r("tests"),
      zeroapi: <Yes label={yes} strong />,
      supabase: <No label={no} />,
      firebase: <No label={no} />,
    },
    {
      label: r("docs"),
      zeroapi: <Yes label={yes} />,
      supabase: <Partial label={r("docsS")} />,
      firebase: <No label={no} />,
    },
    {
      label: r("mobileMoney"),
      zeroapi: <Yes label={yes} strong />,
      supabase: <No label={no} />,
      firebase: <No label={no} />,
    },
    {
      label: r("frPidgin"),
      zeroapi: <Yes label={yes} strong />,
      supabase: <No label={no} />,
      firebase: <No label={no} />,
    },
    {
      label: r("entryPrice"),
      zeroapi: <Txt>{r("entryZ")}</Txt>,
      supabase: <Txt dim>{r("entryS")}</Txt>,
      firebase: <Txt dim>{r("entryF")}</Txt>,
    },
  ];

  return (
    <section id="comparaison" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">{t("kicker")}</span>
          <h2 className="display">
            {t("headlineLead")} <em>{t("headlineAccent")}</em>
          </h2>
          <p>{t("sub")}</p>
        </Reveal>

        <Reveal as="div" className="cmp-card" delay={80}>
          <div className="cmp-scroll">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th scope="col" className="cmp-row-label">
                    <span className="cmp-th-label">{t("characteristic")}</span>
                  </th>
                  <th scope="col" className="cmp-col-zeroapi">
                    <div className="cmp-th">
                      <span className="cmp-th-name">ZeroAPI</span>
                      <span className="cmp-th-badge">{t("recommended")}</span>
                    </div>
                  </th>
                  <th scope="col">
                    <div className="cmp-th">
                      <span className="cmp-th-name">Supabase</span>
                    </div>
                  </th>
                  <th scope="col">
                    <div className="cmp-th">
                      <span className="cmp-th-name">Firebase</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="cmp-row-label">
                      {row.label}
                    </th>
                    <td className="cmp-col-zeroapi">{row.zeroapi}</td>
                    <td>{row.supabase}</td>
                    <td>{row.firebase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cmp-foot">
            <span className="cmp-foot-note">{t("footNote")}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
