"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send, ShieldCheck } from "lucide-react";
import type { TelegramAdminView, TelegramTriggers } from "@/lib/app-settings";
import { saveTelegramSettings, sendTelegramTestMessage } from "@/app/(admin)/admin/settings/telegram/actions";

const TRIGGER_KEYS: Array<keyof TelegramTriggers> = [
  "failedLogin",
  "rateLimit",
  "pathScan",
  "productActivity",
];

export function TelegramSettings({ view }: { view: TelegramAdminView }) {
  const t = useTranslations("admin");
  const [enabled, setEnabled] = useState(view.enabled);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState(view.chatId ?? "");
  const [triggers, setTriggers] = useState<TelegramTriggers>(view.triggers);
  const [saving, startSave] = useTransition();
  const [testing, setTesting] = useState(false);

  const sourceLabel =
    view.source === "db"
      ? t("telegram.sourceDb")
      : view.source === "env"
        ? t("telegram.sourceEnv")
        : t("telegram.sourceNone");

  function toggleTrigger(key: keyof TelegramTriggers) {
    setTriggers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function onSave() {
    startSave(async () => {
      try {
        await saveTelegramSettings({
          enabled,
          botToken: botToken.trim() || undefined,
          chatId: chatId.trim(),
          triggers,
        });
        setBotToken("");
        toast.success(t("telegram.toastSaved"));
      } catch {
        toast.error(t("telegram.toastSaveError"));
      }
    });
  }

  async function onTest() {
    if (!botToken.trim() && !view.hasToken) {
      toast.error(t("telegram.toastTestNeedsConfig"));
      return;
    }
    if (!chatId.trim()) {
      toast.error(t("telegram.toastTestNeedsConfig"));
      return;
    }
    setTesting(true);
    try {
      const res = await sendTelegramTestMessage({
        botToken: botToken.trim() || undefined,
        chatId: chatId.trim(),
      });
      if (res.ok) {
        toast.success(t("telegram.toastTestOk"));
      } else {
        toast.error(t("telegram.toastTestFail", { reason: res.reason ?? "" }));
      }
    } catch {
      toast.error(t("telegram.toastTestFail", { reason: "" }));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Status + enable toggle */}
      <div className="rounded-[14px] border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={
                "grid h-9 w-9 place-items-center rounded-[10px] " +
                (view.enabled ? "bg-accent text-accent-ink" : "border border-line text-muted")
              }
            >
              <Send className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[14px] font-medium">
                {view.enabled ? t("telegram.statusEnabled") : t("telegram.statusDisabled")}
              </div>
              <div className="text-[12px] text-muted">{sourceLabel}</div>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            {t("telegram.enabledLabel")}
          </label>
        </div>
      </div>

      {/* Credentials */}
      <div className="space-y-4 rounded-[14px] border border-line bg-surface p-5">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">{t("telegram.tokenLabel")}</label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder={
              view.hasToken ? t("telegram.tokenPlaceholderKeep") : t("telegram.tokenPlaceholderNew")
            }
            className="w-full rounded-[9px] border border-line bg-bg px-3 py-2 font-mono text-[13px] outline-none transition focus:border-line-2"
          />
          <p className="mt-1.5 text-[11.5px] text-muted">
            {view.hasToken
              ? `${t("telegram.currentToken")} ${view.tokenMask}`
              : t("telegram.noToken")}
            {" · "}
            {t("telegram.tokenHelp")}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium">{t("telegram.chatIdLabel")}</label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder={t("telegram.chatIdPlaceholder")}
            className="w-full rounded-[9px] border border-line bg-bg px-3 py-2 font-mono text-[13px] outline-none transition focus:border-line-2"
          />
          <p className="mt-1.5 text-[11.5px] text-muted">{t("telegram.chatIdHelp")}</p>
        </div>
      </div>

      {/* Triggers */}
      <div className="rounded-[14px] border border-line bg-surface p-5">
        <div className="mb-3 text-[13px] font-medium">{t("telegram.triggersTitle")}</div>
        <div className="space-y-2.5">
          {TRIGGER_KEYS.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={triggers[key]}
                onChange={() => toggleTrigger(key)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {t(`telegram.triggers.${key}`)}
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? t("telegram.savingBtn") : t("telegram.saveBtn")}
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={testing}
          className="inline-flex items-center gap-2 rounded-[9px] border border-line px-4 py-2 text-[13px] transition hover:border-line-2 disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" />
          {testing ? t("telegram.testingBtn") : t("telegram.testBtn")}
        </button>
      </div>

      {/* How-to */}
      <div className="rounded-[14px] border border-line bg-bg-2 p-5 text-[12.5px] text-muted">
        <div className="mb-2 flex items-center gap-2 font-medium text-ink">
          <ShieldCheck className="h-4 w-4" />
          {t("telegram.howtoTitle")}
        </div>
        <ol className="list-decimal space-y-1 pl-5">
          <li>{t("telegram.howto1")}</li>
          <li>{t("telegram.howto2")}</li>
          <li>{t("telegram.howto3")}</li>
        </ol>
      </div>
    </div>
  );
}
