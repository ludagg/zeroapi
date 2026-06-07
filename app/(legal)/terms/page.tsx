import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("terms.meta.title"),
    description: t("terms.meta.description"),
  };
}

export default function TermsPage() {
  const t = useTranslations("legal");
  const sections = t.raw("terms.sections") as Array<{
    id: string;
    heading: string;
    paragraphs?: string[];
    intro?: string;
    items?: string[];
    outro?: string;
    tableHeaders?: string[];
    plans?: Array<{ name: string; price: string; commitment: string }>;
    sub?: Array<{ heading: string; body: string }>;
    body?: string;
    statusLink?: string;
    privacyLink?: string;
    gdprLink?: string;
    and?: string;
    outroEnd?: string;
  }>;
  const tocItems = t.raw("terms.toc.items") as string[];

  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">{t("terms.eyebrow")}</div>
      <h1>
        {t("terms.title")} <em style={{ fontStyle: "italic" }}>{t("terms.titleAccent")}</em>
      </h1>
      <div className="updated">{t("terms.updated")}</div>

      <div className="callout">{t("terms.callout")}</div>

      <div className="toc">
        <h4>{t("terms.toc.title")}</h4>
        <ol>
          {tocItems.map((item, i) => (
            <li key={i}>
              <a href={`#article-${i + 1}`}>{item}</a>
            </li>
          ))}
        </ol>
      </div>

      {sections.map((section) => {
        if (section.id === "article-1") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              {(section.paragraphs ?? []).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          );
        }
        if (section.id === "article-2") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {(section.items ?? []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p>{section.outro}</p>
            </div>
          );
        }
        if (section.id === "article-3") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              {(section.paragraphs ?? []).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          );
        }
        if (section.id === "article-4") {
          const s4 = section as typeof section & {
            tableHeaders: string[];
            plans: Array<{ name: string; price: string; commitment: string }>;
          };
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>{section.intro}</p>
              <table>
                <thead>
                  <tr>
                    {s4.tableHeaders.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s4.plans.map((plan) => (
                    <tr key={plan.name}>
                      <td>{plan.name}</td>
                      <td>{plan.price}</td>
                      <td>{plan.commitment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>{section.outro}</p>
            </div>
          );
        }
        if (section.id === "article-5") {
          const s5 = section as typeof section & {
            sub: Array<{ heading: string; body: string }>;
          };
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              {s5.sub.map((sub) => (
                <div key={sub.heading}>
                  <h3>{sub.heading}</h3>
                  <p>{sub.body}</p>
                </div>
              ))}
            </div>
          );
        }
        if (section.id === "article-6") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>{section.intro}</p>
              <ul>
                {(section.items ?? []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "article-7") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          );
        }
        if (section.id === "article-8") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>
                {section.body}{" "}
                <a href="https://status.zeroapi.app" target="_blank" rel="noreferrer">
                  {section.statusLink}
                </a>
                .
              </p>
            </div>
          );
        }
        if (section.id === "article-9") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              {(section.paragraphs ?? []).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          );
        }
        if (section.id === "article-10") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>
                {section.body}{" "}
                <a href="/privacy">{section.privacyLink}</a> {section.and}{" "}
                <a href="/gdpr">{section.gdprLink}</a>
                {section.outro}
              </p>
            </div>
          );
        }
        if (section.id === "article-11") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          );
        }
        if (section.id === "article-12") {
          return (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          );
        }
        return null;
      })}

      <h2 id="contact">{t("terms.contact.heading")}</h2>
      <p>
        {t("terms.contact.body")}{" "}
        <a href="mailto:legal@zeroapi.app">legal@zeroapi.app</a>.
      </p>
    </article>
  );
}
