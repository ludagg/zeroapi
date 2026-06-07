"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, User } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
});
type Values = z.infer<typeof schema>;

export function ProfileCard({
  initial,
  email,
}: {
  initial: { name: string };
  email: string;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    setSaved(false);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t("settings.profile.errorSave"));
      }
      setSaved(true);
      toast.success(t("settings.profile.successUpdate"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.profile.errorRetry"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsCard
      title={t("settings.profile.title")}
      subtitle={t("settings.profile.subtitle")}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="settings-name" className="mb-2 block text-[13px] font-medium text-ink-2">
            {t("settings.profile.nameLabel")}
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="settings-name"
              type="text"
              autoComplete="name"
              className="input-base pl-10"
              {...register("name")}
            />
          </div>
          {errors.name && (
            <p className="mt-1.5 text-[12px] text-danger">{t("settings.profile.nameRequired")}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-medium text-ink-2">
            {t("settings.profile.emailLabel")}
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="input-base cursor-not-allowed opacity-70"
          />
          <p className="mt-1.5 text-[12px] text-muted">
            {t("settings.profile.emailNotEditable")}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && !isDirty && (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-accent-ink">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t("settings.profile.saved")}
            </span>
          )}
          <button
            type="submit"
            disabled={submitting || !isDirty}
            className="btn-primary h-9 px-4 text-[13px] disabled:opacity-50"
          >
            {submitting ? t("settings.profile.saving") : t("settings.profile.save")}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}

export function SettingsCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <header className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-[12.5px] text-muted">{subtitle}</p>}
      </header>
      <div className="p-5">{children}</div>
    </div>
  );
}
