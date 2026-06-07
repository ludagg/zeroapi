"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/reveal";

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  const maxHeight = open ? innerRef.current?.scrollHeight ?? 0 : 0;

  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button
        type="button"
        className="faq-q"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{q}</span>
        <span className="plus" aria-hidden="true" />
      </button>
      <div className="faq-a" style={{ maxHeight: `${maxHeight}px` }}>
        <div className="faq-a-inner" ref={innerRef}>
          {a}
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  const t = useTranslations("landing.faq");
  const items = t.raw("items") as Array<{ q: string; a: string }>;

  return (
    <section id="faq">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="kicker">{t("kicker")}</span>
          <h2 className="display">
            {t("headlineLead")} <em>{t("headlineAccent")}</em>
          </h2>
          <p>{t("sub")}</p>
        </Reveal>

        <Reveal as="div" className="faq-wrap">
          {items.map((it) => (
            <FAQItem key={it.q} q={it.q} a={it.a} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
