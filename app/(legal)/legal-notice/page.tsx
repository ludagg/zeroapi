import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("legalNotice.meta.title"),
    description: t("legalNotice.meta.description"),
  };
}

export default function LegalNoticePage() {
  const t = useTranslations("legal");
  const sections = t.raw("legalNotice.sections") as Array<{
    id: string;
    heading: string;
    lines?: string[];
    body?: string;
    intro?: string;
    hosts?: Array<{ name: string; address: string; link?: string; href?: string }>;
    para1?: string;
    para2?: string;
    termsLink?: string;
    para2end?: string;
    general?: string;
    legal?: string;
    data?: string;
    security?: string;
  }>;

  return (
    <article className="legal-wrap">
      <div className="eyebrow-row">{t("legalNotice.eyebrow")}</div>
      <h1>
        {t("legalNotice.title")} <em style={{ fontStyle: "italic" }}>{t("legalNotice.titleAccent")}</em>
      </h1>
      <div className="updated">{t("legalNotice.updated")}</div>

      {sections.map((section) => {
        if (section.id === "editeur") {
          const lines = section.lines ?? [];
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>
                <strong>ZeroAPI SAS</strong>
                <br />
                {lines[0]}
                <br />
                {lines[1]}
                <br />
                {lines[2]}
                <br />
                {lines[3]} <a href="mailto:bonjour@zeroapi.app">bonjour@zeroapi.app</a>
              </p>
            </div>
          );
        }
        if (section.id === "directeur") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          );
        }
        if (section.id === "hebergement") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>
                {section.intro}
              </p>
              <ul>
                {(section.hosts ?? []).map((host) => (
                  <li key={host.name}>
                    <strong>{host.name}</strong>, {host.address}
                    {host.link ? (
                      <>
                        {" "}—{" "}
                        <a href={host.href} target="_blank" rel="noreferrer">
                          {host.link}
                        </a>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (section.id === "pi") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.para1}</p>
              <p>
                {section.para2}{" "}
                <a href="/terms">{section.termsLink}</a>
                {section.para2end}
              </p>
            </div>
          );
        }
        if (section.id === "marques") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          );
        }
        if (section.id === "liens") {
          return (
            <div key={section.id}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          );
        }
        if (section.id === "credits") {
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
                {section.general}{" "}
                <a href="mailto:bonjour@zeroapi.app">bonjour@zeroapi.app</a>
                <br />
                {section.legal}{" "}
                <a href="mailto:legal@zeroapi.app">legal@zeroapi.app</a>
                <br />
                {section.data}{" "}
                <a href="mailto:dpo@zeroapi.app">dpo@zeroapi.app</a>
                <br />
                {section.security}{" "}
                <a href="mailto:security@zeroapi.app">security@zeroapi.app</a>
              </p>
            </div>
          );
        }
        return null;
      })}
    </article>
  );
}
