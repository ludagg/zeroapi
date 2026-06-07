"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Check,
  CreditCard,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Shield,
  ShieldOff,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type { Plan } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PLAN_LIMITS, PLAN_ORDER } from "@/lib/plans";
import {
  deleteUser,
  demoteUser,
  promoteUser,
  resetUserGenerations,
  setUserGenerationsLimit,
  setUserPlan,
} from "./actions";

type Props = {
  userId: string;
  email: string;
  currentRole: "USER" | "ADMIN";
  currentPlan: Plan;
  currentLimit: number;
  isSelf: boolean;
};

export function UserRowActions({
  userId,
  email,
  currentRole,
  currentPlan,
  currentLimit,
  isSelf,
}: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"root" | "plan">("root");
  const [pending, start] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("admin");

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setView("root");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setView("root");
      }
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setView("root");
  }

  function run(fn: () => Promise<void>, success: string) {
    start(async () => {
      try {
        await fn();
        toast.success(success);
        close();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("rowActions.actionImpossible"));
      }
    });
  }

  function onChangePlan(plan: Plan) {
    if (plan === currentPlan) {
      close();
      return;
    }
    run(
      () => setUserPlan({ userId, plan }),
      t("rowActions.toastPlanSet", { label: PLAN_LIMITS[plan].label }),
    );
  }

  function onReset() {
    run(() => resetUserGenerations(userId), t("rowActions.toastResetGenerations"));
  }

  function onEditLimit() {
    const raw = window.prompt(
      t("rowActions.planPrompt", { email }),
      String(currentLimit),
    );
    if (raw === null) return;
    const limit = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(limit) || limit < 0 || limit > 100_000) {
      toast.error(t("rowActions.invalidLimit"));
      return;
    }
    run(
      () => setUserGenerationsLimit({ userId, limit }),
      t("rowActions.toastLimitUpdated", { limit }),
    );
  }

  function onToggleRole() {
    if (currentRole === "ADMIN") {
      run(() => demoteUser(userId), t("rowActions.toastDemoted"));
    } else {
      run(() => promoteUser(userId), t("rowActions.toastPromoted"));
    }
  }

  function onDelete() {
    const ok = window.confirm(t("rowActions.confirmDelete", { email }));
    if (!ok) return;
    run(() => deleteUser(userId), t("rowActions.toastDeleted"));
  }

  return (
    <div ref={wrapperRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-label={t("rowActions.openActions")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-60 overflow-hidden rounded-[10px] border border-line bg-surface shadow-lg"
        >
          {view === "root" && (
            <div className="py-1 text-[13px]">
              <MenuButton
                icon={<CreditCard className="h-3.5 w-3.5" />}
                onClick={() => setView("plan")}
                trailing={
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-muted">
                    {currentPlan}
                  </span>
                }
              >
                {t("rowActions.changePlan")}
              </MenuButton>
              <MenuButton
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={onReset}
              >
                {t("rowActions.resetGenerations")}
              </MenuButton>
              <MenuButton
                icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
                onClick={onEditLimit}
                trailing={
                  <span className="font-mono text-[10.5px] text-muted">{currentLimit}</span>
                }
              >
                {t("rowActions.editLimit")}
              </MenuButton>
              <div className="my-1 border-t border-line" />
              <MenuButton
                icon={
                  currentRole === "ADMIN" ? (
                    <ShieldOff className="h-3.5 w-3.5" />
                  ) : (
                    <Shield className="h-3.5 w-3.5" />
                  )
                }
                onClick={onToggleRole}
                disabled={currentRole === "ADMIN" && isSelf}
                title={
                  currentRole === "ADMIN" && isSelf
                    ? t("rowActions.cannotDemoteSelf")
                    : undefined
                }
              >
                {currentRole === "ADMIN" ? t("rowActions.demote") : t("rowActions.promote")}
              </MenuButton>
              <div className="my-1 border-t border-line" />
              <MenuButton
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={onDelete}
                disabled={isSelf}
                danger
                title={isSelf ? t("rowActions.cannotDeleteSelf") : undefined}
              >
                {t("rowActions.deleteAccount")}
              </MenuButton>
            </div>
          )}

          {view === "plan" && (
            <div className="py-1 text-[13px]">
              <div className="px-3 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                {t("rowActions.planHeader")}
              </div>
              {PLAN_ORDER.map((p) => {
                const info = PLAN_LIMITS[p];
                const active = p === currentPlan;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChangePlan(p)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition hover:bg-bg-2",
                      active && "bg-bg-2",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "grid h-3.5 w-3.5 place-items-center",
                          active ? "text-ink" : "text-muted-2",
                        )}
                      >
                        {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className="font-medium">{info.label}</span>
                    </span>
                    <span className="font-mono text-[10.5px] text-muted">
                      {info.generations} gén · {info.priceEUR}€
                    </span>
                  </button>
                );
              })}
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                onClick={() => setView("root")}
                className="w-full px-3 py-1.5 text-left text-[12.5px] text-muted transition hover:bg-bg-2 hover:text-ink"
              >
                {t("rowActions.back")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuButton({
  icon,
  children,
  onClick,
  disabled,
  danger,
  trailing,
  title,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  trailing?: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
        danger
          ? "text-danger hover:bg-danger-soft"
          : "text-ink-2 hover:bg-bg-2 hover:text-ink",
      )}
    >
      <span className="flex items-center gap-2">
        <span className={danger ? "text-danger" : "text-muted"}>{icon}</span>
        <span>{children}</span>
      </span>
      {trailing}
    </button>
  );
}
