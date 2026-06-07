"use client";

import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { SettingsCard } from "./profile-card";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(10),
    confirm: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ["confirm"],
    message: "MISMATCH",
  });

type Values = z.infer<typeof schema>;

export function PasswordCard() {
  const t = useTranslations("dashboard");
  const [submitting, setSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t("settings.password.errorWrong"));
      }
      toast.success(t("settings.password.successUpdate"));
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.password.errorRetry"));
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(key: keyof typeof errors): string | undefined {
    const e = errors[key];
    if (!e) return undefined;
    if (key === "currentPassword") return t("settings.password.currentRequired");
    if (key === "newPassword") return t("settings.password.minLength");
    if (key === "confirm") {
      return e.message === "MISMATCH"
        ? t("settings.password.mismatch")
        : t("settings.password.confirmRequired");
    }
    return e.message;
  }

  return (
    <SettingsCard
      title={t("settings.password.title")}
      subtitle={t("settings.password.subtitle")}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <PwdField
          id="settings-pwd-current"
          label={t("settings.password.currentLabel")}
          show={showCurrent}
          onToggle={() => setShowCurrent((s) => !s)}
          error={fieldError("currentPassword")}
          register={register("currentPassword")}
          autoComplete="current-password"
          showAriaLabel={t("settings.password.showAriaLabel")}
          hideAriaLabel={t("settings.password.hideAriaLabel")}
        />
        <PwdField
          id="settings-pwd-new"
          label={t("settings.password.newLabel")}
          show={showNew}
          onToggle={() => setShowNew((s) => !s)}
          error={fieldError("newPassword")}
          register={register("newPassword")}
          autoComplete="new-password"
          showAriaLabel={t("settings.password.showAriaLabel")}
          hideAriaLabel={t("settings.password.hideAriaLabel")}
        />
        <PwdField
          id="settings-pwd-confirm"
          label={t("settings.password.confirmLabel")}
          show={showNew}
          onToggle={() => setShowNew((s) => !s)}
          error={fieldError("confirm")}
          register={register("confirm")}
          autoComplete="new-password"
          hideToggle
          showAriaLabel={t("settings.password.showAriaLabel")}
          hideAriaLabel={t("settings.password.hideAriaLabel")}
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary h-9 px-4 text-[13px] disabled:opacity-50"
          >
            {submitting ? t("settings.password.updating") : t("settings.password.update")}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}

function PwdField({
  id,
  label,
  show,
  onToggle,
  error,
  register,
  autoComplete,
  hideToggle,
  showAriaLabel,
  hideAriaLabel,
}: {
  id: string;
  label: string;
  show: boolean;
  onToggle: () => void;
  error: string | undefined;
  register: UseFormRegisterReturn;
  autoComplete: string;
  hideToggle?: boolean;
  showAriaLabel: string;
  hideAriaLabel: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="••••••••••"
          className={"input-base pl-10 " + (hideToggle ? "" : "pr-11")}
          {...register}
        />
        {!hideToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={show ? hideAriaLabel : showAriaLabel}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  );
}
