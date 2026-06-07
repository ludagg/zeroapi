import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("privacy.meta.title"),
    description: t("privacy.meta.description"),
  };
}

export default function PrivacyPage() {
  const t = useTranslations("legal");
  const tocItems = t.raw("privacy.toc.items") as string[];
  const tocAnchors = [
    "responsable",
    "donnees",
    "finalites",
    "partage",
    "transferts",
    "duree",
    "droits",
    "securite",
    "contact",
  ];
  const sections = t.raw("privacy.sections") as Array<{
    id: string;
    heading: string;
    body?: string;
    sub?: Array<{
      heading: string;
      items?: string[];
      body?: string;
      cookieLink?: string;
      outro?: string;
    }>;
    tableHeaders?: string[];
    rows?: Array<Record<string, string>>;
    noTraining?: string;
    intro?: string;
    outro?: string;
    items?: Array<{ label: string; body: string }>;
    securityLink?: string;
    para1?: string;
    para2?: string;
    cnilLink?: string;
    para2end?: string;
  }>;

  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">{t("privacy.eyebrow")}</div>
      <h1>
        {t("privacy.title")} <em style={{ fontStyle: "italic" }}>{t("privacy.titleAccent")}</em>
      </h1>
      <div className="updated">{t("privacy.updated")}</div>

      <div className="callout">
        <strong>{t("privacy.callout.lead")}</strong> {t("privacy.callout.body")}
      </div>

      <div className="toc">
        <h4>{t("privacy.toc.title")}</h4>
        <ol>
          {tocItems.map((item, i) => (
            <li key={i}>
              <a href={`#${tocAnchors[i]}`}>{item}</a>
            </li>
          ))}
        </ol>
      </div>

      {sections.map((section) => {
        if (section.id === "responsable") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>
                {section.body}{" "}
                <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>.
              </p>
            </div>
          );
        }
        if (section.id === "donnees") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              {(section.sub ?? []).map((sub, si) => (
                <div key={si}>
                  <h3>{sub.heading}</h3>
                  {sub.items ? (
                    <ul>
                      {sub.items.map((item, ii) => (
                        <li key={ii}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      {sub.body}{" "}
                      <a href="/cookies">{sub.cookieLink}</a>
                      {sub.outro}
                    </p>
                  )}
                </div>
              ))}
            </div>
          );
        }
        if (section.id === "finalites") {
          const rows = (section.rows ?? []) as Array<{
            purpose: string;
            basis: string;
            duration: string;
          }>;
          const headers = section.tableHeaders ?? [];
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <table>
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri}>
                      <td>{row.purpose}</td>
                      <td>{row.basis}</td>
                      <td>{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                <strong>{section.noTraining}</strong>
              </p>
            </div>
          );
        }
        if (section.id === "partage") {
          const rows = (section.rows ?? []) as Array<{
            name: string;
            role: string;
            location: string;
          }>;
          const headers = section.tableHeaders ?? [];
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>{section.intro}</p>
              <table>
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri}>
                      <td>{row.name}</td>
                      <td>{row.role}</td>
                      <td>{row.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>{section.outro}</p>
            </div>
          );
        }
        if (section.id === "transferts") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          );
        }
        if (section.id === "duree") {
          const items = (section.items ?? []) as Array<{
            label: string;
            body: string;
          }>;
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <ul>
                {items.map((item, i) => (
                  <li key={i}>
                    <strong>{item.label}</strong> : {item.body}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "droits") {
          const items = (section.items ?? []) as Array<{
            label: string;
            body: string;
          }>;
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {items.map((item, i) => (
                  <li key={i}>
                    <strong>{item.label}</strong> : {item.body}
                  </li>
                ))}
              </ul>
              <p>{section.outro}</p>
            </div>
          );
        }
        if (section.id === "securite") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>
                {section.body} <a href="/security">{section.securityLink}</a>
                {section.outro}
              </p>
            </div>
          );
        }
        if (section.id === "contact") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>
                {section.para1}{" "}
                <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>.
              </p>
              <p>
                {section.para2}{" "}
                <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
                  {section.cnilLink}
                </a>
                {section.para2end}
              </p>
            </div>
          );
        }
        return null;
      })}
    </article>
  );
}
