import Link from "next/link";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("api.meta.title"),
    description: t("api.meta.description"),
  };
}

type Param = {
  name: string;
  type: string;
  required?: boolean;
  desc: string;
};

type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  desc: string;
  params?: Param[];
};

type Group = {
  group: string;
  intro: string;
  eps: Endpoint[];
};

type ErrorEntry = {
  code: number;
  name: string;
  desc: string;
};

type OtherLink = { href: string; label: string };

function MethodLabel({ m }: { m: Endpoint["method"] }) {
  return <span className={`docs-method ${m.toLowerCase()}`}>{m}</span>;
}

export default function ApiReferencePage() {
  const t = useTranslations("legal");
  const groups = t.raw("api.groups") as Group[];
  const errors = t.raw("api.errors") as ErrorEntry[];
  const otherLinks = t.raw("api.otherLinks") as OtherLink[];
  const paramHeaders = t.raw("api.paramHeaders") as string[];
  const errorHeaders = t.raw("api.errorHeaders") as string[];

  return (
    <article className="docs-wrap">
      <header className="docs-head" style={{ textAlign: "left", marginBottom: 40 }}>
        <div className="eyebrow-row">
          <Link href="/docs">{t("api.eyebrow")}</Link> · {t("api.eyebrowSub")}
        </div>
        <h1>
          {t("api.title")} <em>{t("api.titleAccent")}</em>.
        </h1>
        <p style={{ margin: 0 }}>
          Base URL : <code>https://&lt;ton-projet&gt;.zeroapi.app</code>. {t("api.subtitle")}
        </p>
      </header>

      <div className="docs-article">
        <aside className="docs-sidebar">
          <h4>{t("api.sidebarTitle")}</h4>
          <ul>
            {groups.map((g, i) => (
              <li key={g.group}>
                <a href={`#${g.group}`} className={i === 0 ? "active" : ""}>
                  {g.group}
                </a>
              </li>
            ))}
            <li>
              <a href="#errors">{t("api.errorsLink")}</a>
            </li>
            <li>
              <a href="#rate-limits">{t("api.rateLimitsLink")}</a>
            </li>
          </ul>
          <div className="docs-side-group">
            <h4>{t("api.otherResources")}</h4>
            <ul>
              {otherLinks.map((link) => (
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
            <div>{t("api.callout")}</div>
          </div>

          <h2 id="auth-header">{t("api.authHeader")}</h2>
          <p>{t("api.authNote")}</p>
          <pre className="docs-code">
            <span className="k">Authorization</span>: Bearer{" "}
            <span className="s">&lt;access_token&gt;</span>
          </pre>

          {groups.map((g) => (
            <section key={g.group} id={g.group}>
              <h2>{g.group}</h2>
              <p>{g.intro}</p>
              {g.eps.map((ep) => (
                <div className="docs-endpoint" key={`${ep.method}-${ep.path}`}>
                  <div className="docs-endpoint-head">
                    <MethodLabel m={ep.method} />
                    <span className="docs-endpoint-path">{ep.path}</span>
                  </div>
                  <div className="docs-endpoint-body">
                    <p>{ep.desc}</p>
                    {ep.params && ep.params.length > 0 && (
                      <table className="docs-params">
                        <thead>
                          <tr>
                            {paramHeaders.map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ep.params.map((p) => (
                            <tr key={p.name}>
                              <td>
                                <code>{p.name}</code>
                              </td>
                              <td>
                                <code>{p.type}</code>
                              </td>
                              <td>{p.required ? t("api.yes") : t("api.na")}</td>
                              <td>{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ))}
            </section>
          ))}

          <h2 id="errors">{t("api.errorsTitle")}</h2>
          <p>{t("api.errorsNote")}</p>
          <pre className="docs-code">
            {"{\n  "}
            <span className="k">&quot;error&quot;</span>: {"{\n    "}
            <span className="k">&quot;code&quot;</span>:{" "}
            <span className="s">&quot;VALIDATION_FAILED&quot;</span>,{"\n    "}
            <span className="k">&quot;message&quot;</span>:{" "}
            <span className="s">&quot;email doit être valide&quot;</span>,{"\n    "}
            <span className="k">&quot;details&quot;</span>: [ … ],{"\n    "}
            <span className="k">&quot;requestId&quot;</span>:{" "}
            <span className="s">&quot;req_01HABC…&quot;</span>
            {"\n  }\n}"}
          </pre>
          <table className="docs-params">
            <thead>
              <tr>
                {errorHeaders.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {errors.map((e) => (
                <tr key={e.code}>
                  <td>
                    <code>{e.code}</code>
                  </td>
                  <td>
                    <code>{e.name}</code>
                  </td>
                  <td>{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 id="rate-limits">{t("api.rateLimitsTitle")}</h2>
          <p>{t("api.rateLimitsBody")}</p>
        </div>
      </div>
    </article>
  );
}
