import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("security.meta.title"),
    description: t("security.meta.description"),
  };
}

export default function SecurityPage() {
  const t = useTranslations("legal");
  const sections = t.raw("security.sections") as Array<{
    id: string;
    heading: string;
    items?: Array<{ label?: string; body: string } | string>;
    intro?: string;
    outro?: string;
    outroLabel?: string;
    statusLink?: string;
    emailNote?: string;
    response?: string;
    outOfScope?: string;
    outOfScopeLabel?: string;
    gdprLink?: string;
    technical?: string;
    compliance?: string;
  }>;

  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">{t("security.eyebrow")}</div>
      <h1>
        <em style={{ fontStyle: "italic" }}>{t("security.titleAccent")}</em>{" "}
        {t("security.titleRest")}
      </h1>
      <div className="updated">{t("security.updated")}</div>

      <div className="callout">{t("security.callout")}</div>

      {sections.map((section) => {
        if (section.id === "chiffrement") {
          const items = (section.items ?? []) as Array<{ label: string; body: string }>;
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
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
        if (section.id === "auth") {
          const items = section.items as string[];
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <ul>
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "code") {
          const items = section.items as string[];
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p>{section.outro}</p>
            </div>
          );
        }
        if (section.id === "infra") {
          const items = section.items as string[];
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <ul>
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "secrets") {
          const items = section.items as string[];
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "incidents") {
          const items = section.items as string[];
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {items.map((item, i) => (
                  <li key={i}>
                    {i === 0 ? (
                      <>
                        {item.split(section.statusLink ?? "")[0]}
                        <a href="https://status.zeroapi.app" target="_blank" rel="noreferrer">
                          {section.statusLink}
                        </a>
                        {item.split(section.statusLink ?? "")[1]}
                      </>
                    ) : (
                      item
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "disclosure") {
          const items = section.items as string[];
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>
                {section.intro}{" "}
                <a href="mailto:security@zeroapi.app">security@zeroapi.app</a>{" "}
                {section.emailNote}
              </p>
              <ul>
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p>{section.response}</p>
              <p>
                <strong>{section.outOfScopeLabel}</strong> :{" "}
                {section.outOfScope}
              </p>
            </div>
          );
        }
        if (section.id === "conformite") {
          const items = section.items as string[];
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <ul>
                {items.map((item, i) => (
                  <li key={i}>
                    {i === 0 ? (
                      <>
                        {item.split(section.gdprLink ?? "")[0]}
                        <a href="/gdpr">{section.gdprLink}</a>
                        {item.split(section.gdprLink ?? "")[1]}
                      </>
                    ) : (
                      item
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "role") {
          const items = section.items as string[];
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
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
                {section.technical}{" "}
                <a href="mailto:security@zeroapi.app">security@zeroapi.app</a>
                <br />
                {section.compliance}{" "}
                <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>
              </p>
            </div>
          );
        }
        return null;
      })}
    </article>
  );
}
