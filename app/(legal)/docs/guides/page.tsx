import Link from "next/link";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("guides.meta.title"),
    description: t("guides.meta.description"),
  };
}

type GuideItem = {
  slug: string;
  title: string;
  desc: string;
  time: string;
};

type Category = {
  cat: string;
  items: GuideItem[];
};

export default function GuidesIndexPage() {
  const t = useTranslations("legal");
  const categories = t.raw("guides.categories") as Category[];

  return (
    <article className="docs-wrap">
      <header className="docs-head" style={{ textAlign: "left", marginBottom: 40 }}>
        <div className="eyebrow-row">
          <Link href="/docs">{t("guides.eyebrow")}</Link> · {t("guides.eyebrowSub")}
        </div>
        <h1>
          {t("guides.title")} <em>{t("guides.titleAccent")}</em>.
        </h1>
        <p style={{ margin: 0 }}>{t("guides.intro")}</p>
      </header>

      <div className="docs-article" style={{ gridTemplateColumns: "1fr" }}>
        <div className="docs-body" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {categories.map((cat) => (
            <section key={cat.cat}>
              <h2>{cat.cat}</h2>
              <ul style={{ listStyle: "none", padding: 0, gap: 10 }}>
                {cat.items.map((g) => (
                  <li key={g.slug}>
                    <div
                      className="docs-endpoint"
                      style={{ background: "var(--surface)", padding: 0 }}
                    >
                      <div className="docs-endpoint-head" style={{ background: "var(--surface)" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono), monospace",
                            fontSize: 11,
                            color: "var(--muted)",
                          }}
                        >
                          {g.time}
                        </span>
                        <span
                          className="docs-endpoint-path"
                          style={{ fontFamily: "var(--font-serif), serif", fontStyle: "italic", fontSize: 18 }}
                        >
                          {g.title}
                        </span>
                      </div>
                      <div className="docs-endpoint-body">
                        <p>{g.desc}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
