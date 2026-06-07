import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function LoginPanel() {
  const t = useTranslations("auth");
  return (
    <div className="w-full animate-fade-in">
      <div className="mb-7 rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-4 font-mono text-[12px]">
        <div className="mb-3.5 flex items-center justify-between border-b border-dashed border-white/[0.08] pb-3 text-[11px] uppercase tracking-[0.05em] text-[#8C8F87]">
          <div className="flex gap-1.5">
            <i className="h-2 w-2 rounded-full bg-accent" />
            <i className="h-2 w-2 rounded-full bg-white/15" />
            <i className="h-2 w-2 rounded-full bg-white/15" />
          </div>
          <span>console.zeroapi.app / jobs</span>
        </div>

        <div className="flex items-center gap-2.5 py-2 text-[#D7D8D2]">
          <Check className="h-3.5 w-3.5 text-accent" strokeWidth={3} />
          <span className="flex-1">
            api-reservations <span className="text-[#5C5F58]">v1.2</span>
          </span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] tracking-[0.04em] text-accent-ink">
            {t("panels.login.statusReady")}
          </span>
        </div>
        <div className="flex items-center gap-2.5 border-t border-white/[0.05] py-2 text-[#D7D8D2]">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#FFCC66] border-t-transparent" />
          <span className="flex-1">
            chat-rooms-api <span className="text-[#5C5F58]">v2.0</span>
          </span>
          <span className="rounded-full bg-[rgba(255,204,102,0.1)] px-2 py-0.5 text-[10px] tracking-[0.04em] text-[#FFCC66]">
            {t("panels.login.statusInProgress")}
          </span>
        </div>
        <div className="flex items-center gap-2.5 border-t border-white/[0.05] py-2 text-[#D7D8D2] opacity-55">
          <span className="h-3.5 w-3.5 rounded-full border border-dashed border-white/20" />
          <span className="flex-1">
            e-commerce-momo <span className="text-[#5C5F58]">v1</span>
          </span>
          <span className="rounded-full border border-dashed border-white/15 px-2 py-0.5 text-[10px] tracking-[0.04em] text-[#8C8F87]">
            {t("panels.login.statusQueued")}
          </span>
        </div>
      </div>

      <p className="mb-8 font-serif text-[32px] leading-[1.15] tracking-[-0.01em]">
        {t("panels.login.quoteBefore")}{" "}
        <span
          className="px-0.5"
          style={{
            background:
              "linear-gradient(transparent 62%, var(--accent-glow) 62%, var(--accent-glow) 90%, transparent 90%)",
          }}
        >
          {t("panels.login.quoteEm")}
        </span>
        {t("panels.login.quoteAfter")}
        <em className="italic">{t("panels.login.quoteCit")}</em>
        {t("panels.login.quoteEnd")}
      </p>

      <div className="flex items-center gap-3 border-t border-white/[0.08] pt-6">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2A6FDB] to-accent font-mono text-[14px] font-semibold text-accent-ink">
          KD
        </div>
        <div>
          <div className="text-[14px] font-medium">Kossi Dossou</div>
          <div className="mt-0.5 text-[12px] text-[#8C8F87]">{t("panels.login.authorRole")}</div>
        </div>
      </div>
    </div>
  );
}

export function RegisterPanel() {
  const t = useTranslations("auth");
  const features = t.raw("panels.register.features") as Array<{ title: string; desc: string }>;
  return (
    <div className="w-full animate-fade-in">
      <p className="mb-7 font-serif text-[28px] leading-[1.15] tracking-[-0.01em]">
        {t("panels.register.headingLine1")}
        <br />
        {t("panels.register.headingLine2Before")} <em className="italic">{t("panels.register.headingLine2Em")}</em>.
      </p>
      <ul className="flex flex-col gap-3.5">
        {features.map((f) => (
          <li key={f.title} className="flex items-start gap-3.5 text-[14px] text-white/85">
            <Check className="mt-1 h-4 w-4 flex-shrink-0 text-accent" strokeWidth={3} />
            <span>
              <b className="font-medium text-[#F5F6F2]">{f.title}</b>
              {f.desc}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ForgotPanel() {
  const t = useTranslations("auth");
  return (
    <div className="w-full animate-fade-in">
      <p className="font-serif text-[32px] leading-[1.15] tracking-[-0.01em]">
        {t("panels.forgot.headingPart1")}{" "}
        <span
          className="px-0.5"
          style={{
            background:
              "linear-gradient(transparent 62%, var(--accent-glow) 62%, var(--accent-glow) 90%, transparent 90%)",
          }}
        >
          {t("panels.forgot.headingEm1")}
        </span>
        {t("panels.forgot.headingPart2")}
        <br />
        {t("panels.forgot.headingPart3")} <em className="italic">{t("panels.forgot.headingEm2")}</em>
        {t("panels.forgot.headingPart4")}
      </p>
      <ul className="mt-8 flex flex-col gap-3.5 text-[14px] text-white/85">
        <li className="flex items-start gap-3.5">
          <Check className="mt-1 h-4 w-4 flex-shrink-0 text-accent" strokeWidth={2.5} />
          <span>
            {t("panels.forgot.sec0Before")} <b className="font-medium text-[#F5F6F2]">{t("panels.forgot.sec0Bold")}</b>
            {t("panels.forgot.sec0After")}
          </span>
        </li>
        <li className="flex items-start gap-3.5">
          <Check className="mt-1 h-4 w-4 flex-shrink-0 text-accent" strokeWidth={2.5} />
          <span>
            {t("panels.forgot.sec1Before")} <b className="font-medium text-[#F5F6F2]">{t("panels.forgot.sec1Bold")}</b>{" "}
            {t("panels.forgot.sec1After")}
          </span>
        </li>
        <li className="flex items-start gap-3.5">
          <Loader2 className="mt-1 h-4 w-4 flex-shrink-0 text-accent" strokeWidth={2.5} />
          <span>
            {t("panels.forgot.sec2Before")} <b className="font-medium text-[#F5F6F2]">{t("panels.forgot.sec2Bold")}</b>{" "}
            {t("panels.forgot.sec2After")}
          </span>
        </li>
      </ul>
    </div>
  );
}
