import Link from "next/link";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("gettingStarted.meta.title"),
    description: t("gettingStarted.meta.description"),
  };
}

type NavItem = { href: string; label: string };
type GoFurtherLink = { href: string; label: string };
type Section = {
  id: string;
  heading: string;
  intro?: string;
  items?: Array<string | { label: string; body: string }>;
  outro?: string;
  settingsPath?: string;
  newGenLabel?: string;
  exampleLabel?: string;
  body?: string;
  contact?: string;
  guidesLink?: string;
  apiLink?: string;
  templatesLink?: string;
};

export default function GettingStartedPage() {
  const t = useTranslations("legal");
  const nav = t.raw("gettingStarted.nav") as NavItem[];
  const goFurtherLinks = t.raw("gettingStarted.goFurtherLinks") as GoFurtherLink[];
  const sections = t.raw("gettingStarted.sections") as Section[];

  return (
    <article className="docs-wrap">
      <header className="docs-head" style={{ textAlign: "left", marginBottom: 40 }}>
        <div className="eyebrow-row">
          <Link href="/docs">{t("gettingStarted.eyebrow")}</Link> · {t("gettingStarted.eyebrowSub")}
        </div>
        <h1>
          {t("gettingStarted.title")} <em>{t("gettingStarted.titleAccent")}</em>{" "}
          {t("gettingStarted.titleRest")}
        </h1>
        <p style={{ margin: 0 }}>{t("gettingStarted.subtitle")}</p>
      </header>

      <div className="docs-article">
        <aside className="docs-sidebar">
          <h4>{t("gettingStarted.onThisPage")}</h4>
          <ul>
            {nav.map((item, i) => (
              <li key={item.href}>
                <a href={item.href} className={i === 0 ? "active" : ""}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="docs-side-group">
            <h4>{t("gettingStarted.goFurther")}</h4>
            <ul>
              {goFurtherLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="docs-body">
          <div className="docs-callout">
            <span className="docs-callout-icon">i</span>
            <div>
              <strong>{t("gettingStarted.callout.label")}</strong>{" "}
              {t("gettingStarted.callout.body")}
            </div>
          </div>

          {sections.map((section) => {
            if (section.id === "account") {
              const items = section.items as string[];
              return (
                <div key={section.id}>
                  <h2 id={section.id}>{section.heading}</h2>
                  <p>
                    {section.intro?.split("app.zeroapi.app/register")[0]}
                    <a href="/register">app.zeroapi.app/register</a>
                    {section.intro?.split("app.zeroapi.app/register")[1]}
                  </p>
                  <ul>
                    {items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <p>
                    {section.outro} <code>{section.settingsPath}</code>.
                  </p>
                </div>
              );
            }
            if (section.id === "prompt") {
              const items = section.items as string[];
              return (
                <div key={section.id}>
                  <h2 id={section.id}>{section.heading}</h2>
                  <p>
                    {section.intro?.split(section.newGenLabel ?? "")[0]}
                    <strong>{section.newGenLabel}</strong>
                    {section.intro?.split(section.newGenLabel ?? "")[1]}
                  </p>
                  <ul>
                    {items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <p>{section.exampleLabel}</p>
                  <pre className="docs-code">
                    <span className="c"># Backend pour une app de livraison</span>
                    {"\n"}
                    <span className="k">Entités</span> : users, restaurants, plats,
                    commandes, livreurs.
                    {"\n"}
                    <span className="k">Relations</span> : une commande appartient à un user,
                    contient plusieurs plats, est assignée à un livreur.
                    {"\n"}
                    <span className="k">Règles</span> : seul l&apos;admin peut créer un
                    restaurant. Un livreur ne voit que ses commandes en cours.
                    {"\n"}
                    <span className="k">Paiement</span> : Wave + Orange Money via webhook.
                    {"\n"}
                    <span className="k">Notifications</span> : push au client à chaque
                    changement de statut.
                  </pre>
                </div>
              );
            }
            if (section.id === "review") {
              const items = section.items as string[];
              return (
                <div key={section.id}>
                  <h2 id={section.id}>{section.heading}</h2>
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
            if (section.id === "deploy") {
              const items = section.items as Array<{ label: string; body: string }>;
              return (
                <div key={section.id}>
                  <h2 id={section.id}>{section.heading}</h2>
                  <p>{section.intro}</p>
                  <ul>
                    {items.map((item, i) => (
                      <li key={i}>
                        <strong>{item.label}</strong>{item.body}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            if (section.id === "next") {
              return (
                <div key={section.id}>
                  <h2 id={section.id}>{section.heading}</h2>
                  <p>
                    {section.body
                      ?.split(section.guidesLink ?? "")[0]}
                    <Link href="/docs/guides">{section.guidesLink}</Link>
                    {section.body
                      ?.split(section.guidesLink ?? "")[1]
                      ?.split(section.apiLink ?? "")[0]}
                    <Link href="/docs/api">{section.apiLink}</Link>
                    {section.body
                      ?.split(section.apiLink ?? "")[1]
                      ?.split(section.templatesLink ?? "")[0]}
                    <Link href="/templates">{section.templatesLink}</Link>
                    {section.body
                      ?.split(section.templatesLink ?? "")[1]}
                  </p>
                  <p>
                    {section.contact
                      ?.split("bonjour@zeroapi.app")[0]}
                    <a href="mailto:bonjour@zeroapi.app">bonjour@zeroapi.app</a>
                    {section.contact
                      ?.split("bonjour@zeroapi.app")[1]}
                  </p>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </article>
  );
}
