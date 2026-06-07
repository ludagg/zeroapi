import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("gdpr.meta.title"),
    description: t("gdpr.meta.description"),
  };
}

export default function GDPRPage() {
  const t = useTranslations("legal");
  const sections = t.raw("gdpr.sections") as Array<{
    id: string;
    heading: string;
    body?: string;
    body2?: string;
    dpaLabel?: string;
    outro?: string;
    outroEnd?: string;
    intro?: string;
    items?: Array<{
      label?: string;
      body: string;
      link?: string;
      linkHref?: string;
      href?: string;
    }>;
    sub?: Array<{
      heading: string;
      intro?: string;
      channels?: Array<{ label: string; body: string }>;
      outro?: string;
      tableHeaders?: string[];
      rows?: Array<Record<string, string>>;
    }>;
    emailLabel?: string;
    addressLabel?: string;
    address?: string;
    privacyLink?: string;
  }>;

  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">{t("gdpr.eyebrow")}</div>
      <h1>
        {t("gdpr.title")} <em style={{ fontStyle: "italic" }}>{t("gdpr.titleAccent")}</em>
      </h1>
      <div className="updated">{t("gdpr.updated")}</div>

      <div className="callout">{t("gdpr.callout")}</div>

      {sections.map((section) => {
        if (section.id === "cadre") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {(section.items ?? []).map((item, i) => (
                  <li key={i}>
                    {item.label ? <strong>{item.label}</strong> : null}{" "}
                    {item.body}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "dpo") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.intro}</p>
              <p>
                <strong>{section.emailLabel}</strong> :{" "}
                <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>
                <br />
                <strong>{section.addressLabel}</strong> : {section.address}
              </p>
            </div>
          );
        }
        if (section.id === "principes") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <ul>
                {(section.items ?? []).map((item, i) => (
                  <li key={i}>
                    <strong>{item.label}</strong> :{" "}
                    {item.link ? (
                      <>
                        {item.body}{" "}
                        <a href={item.linkHref}>{item.link}</a>.
                      </>
                    ) : (
                      item.body
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "droits") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              {(section.sub ?? []).map((sub, si) => {
                if (si === 0) {
                  return (
                    <div key={si}>
                      <h3>{sub.heading}</h3>
                      <p>{sub.intro}</p>
                      <ul>
                        {(sub.channels ?? []).map((ch, ci) => (
                          <li key={ci}>
                            <strong>{ch.label}</strong> :{" "}
                            {ci === 1 ? (
                              <a href="mailto:dpo@zeroapi.app">{ch.body}</a>
                            ) : (
                              ch.body
                            )}
                          </li>
                        ))}
                      </ul>
                      <p>{sub.outro}</p>
                    </div>
                  );
                }
                return (
                  <div key={si}>
                    <h3>{sub.heading}</h3>
                    <table>
                      <thead>
                        <tr>
                          {(sub.tableHeaders ?? []).map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(sub.rows ?? []).map((row, ri) => (
                          <tr key={ri}>
                            <td>{row.right}</td>
                            <td>{row.desc}</td>
                            <td>{row.article}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          );
        }
        if (section.id === "transferts") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {(section.items ?? []).map((item, i) => (
                  <li key={i}>
                    {item.label ? <strong>{item.label}</strong> : null}{" "}
                    {item.body}
                  </li>
                ))}
              </ul>
              <p>
                {section.outro}{" "}
                <a href="/privacy">{section.privacyLink}</a>
                {section.outroEnd}
              </p>
            </div>
          );
        }
        if (section.id === "aipd") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {(section.items ?? []).map((item, i) => (
                  <li key={i}>{typeof item === "string" ? item : item.body}</li>
                ))}
              </ul>
              <p>
                {section.outro}{" "}
                <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>.
              </p>
            </div>
          );
        }
        if (section.id === "violations") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {(section.items ?? []).map((item, i) => (
                  <li key={i}>
                    {item.label ? <strong>{item.label}</strong> : null}{" "}
                    {item.body}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "dpa") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>
                {section.body}{" "}
                <strong>{section.dpaLabel}</strong>{" "}
                {section.body2}{" "}
                <a href="mailto:legal@zeroapi.app">legal@zeroapi.app</a>{" "}
                {section.outro}
              </p>
            </div>
          );
        }
        if (section.id === "autorites") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {(section.items ?? []).map((item, i) => (
                  <li key={i}>
                    <strong>{item.label}</strong> : {item.body}{" "}
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noreferrer">
                        {item.link}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "contact") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>
                {section.body}{" "}
                <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>.
              </p>
            </div>
          );
        }
        return null;
      })}
    </article>
  );
}
