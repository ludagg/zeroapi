import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("cookies.meta.title"),
    description: t("cookies.meta.description"),
  };
}

export default function CookiesPage() {
  const t = useTranslations("legal");
  const sections = t.raw("cookies.sections") as Array<{
    id: string;
    heading: string;
    body?: string;
    sub?: Array<{
      id?: string;
      heading: string;
      intro?: string;
      tableHeaders?: string[];
      rows?: Array<{ name: string; purpose: string; duration: string; issuer: string }>;
      links?: Array<{ label: string; href: string }>;
      items?: string[];
      browsers?: Array<{ label: string; href: string }>;
    }>;
  }>;

  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">{t("cookies.eyebrow")}</div>
      <h1>
        {t("cookies.title")} <em style={{ fontStyle: "italic" }}>{t("cookies.titleAccent")}</em>
      </h1>
      <div className="updated">{t("cookies.updated")}</div>

      <div className="callout">{t("cookies.callout")}</div>

      {sections.map((section) => {
        if (section.id === "what") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          );
        }
        if (section.id === "used") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              {(section.sub ?? []).map((sub) => {
                if (sub.id === "necessary" || sub.id === "analytics") {
                  return (
                    <div key={sub.id}>
                      <h3>{sub.heading}</h3>
                      <p>{sub.intro}</p>
                      <table>
                        <thead>
                          <tr>
                            {(sub.tableHeaders ?? []).map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(sub.rows ?? []).map((row) => (
                            <tr key={row.name}>
                              <td>
                                <code>{row.name}</code>
                              </td>
                              <td>{row.purpose}</td>
                              <td>{row.duration}</td>
                              <td>{row.issuer}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                if (sub.id === "third") {
                  return (
                    <div key={sub.id}>
                      <h3>{sub.heading}</h3>
                      <p>{sub.intro}</p>
                      <ul>
                        {(sub.links ?? []).map((link) => (
                          <li key={link.href}>
                            <a href={link.href} target="_blank" rel="noreferrer">
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          );
        }
        if (section.id === "manage") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              {(section.sub ?? []).map((sub, si) => (
                <div key={si}>
                  <h3>{sub.heading}</h3>
                  <p>{sub.intro}</p>
                  {sub.items ? (
                    <ul>
                      {sub.items.map((item, ii) => (
                        <li key={ii}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  {sub.browsers ? (
                    <ul>
                      {sub.browsers.map((b) => (
                        <li key={b.href}>
                          <a href={b.href} target="_blank" rel="noreferrer">
                            {b.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          );
        }
        if (section.id === "noad") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          );
        }
        if (section.id === "evolution") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
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
