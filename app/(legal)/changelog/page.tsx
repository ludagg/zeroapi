import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("changelog.meta.title"),
    description: t("changelog.meta.description"),
  };
}

type Section = {
  kind: "added" | "fixed" | "changed";
  title: string;
  items: string[];
};

type Release = {
  version: string;
  date: string;
  tag: "major" | "minor" | "patch";
  title: string;
  sections: Section[];
};

export default function ChangelogPage() {
  const t = useTranslations("legal");
  const releases = t.raw("changelog.releases") as Release[];

  return (
    <article className="changelog-wrap">
      <header className="changelog-head">
        <div className="eyebrow-row">{t("changelog.eyebrow")}</div>
        <h1>
          {t("changelog.title")} <em>{t("changelog.titleAccent")}</em>.
        </h1>
        <p>
          {t("changelog.intro")}(
          <a
            href="/changelog.rss"
            style={{
              color: "var(--ink)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              textDecorationColor: "var(--accent)",
            }}
          >
            {t("changelog.rssLink")}
          </a>
          ){t("changelog.introEnd")}
        </p>
      </header>

      <div className="changelog-list">
        {releases.map((r) => (
          <article key={r.version} className="changelog-entry">
            <div className="changelog-meta">
              <div className="changelog-version">v{r.version}</div>
              <div className="changelog-date">{r.date}</div>
              <span className={`changelog-tag ${r.tag}`}>{r.tag}</span>
            </div>
            <div className="changelog-body">
              <h3>{r.title}</h3>
              {r.sections.map((s) => (
                <div key={s.title} className={`changelog-section ${s.kind}`}>
                  <h4>{s.title}</h4>
                  <ul>
                    {s.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}
