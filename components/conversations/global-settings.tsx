"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { ApplyOperation } from "@/components/conversations/spec-graph";
import { useTranslations } from "next-intl";

const OAUTH_PROVIDERS = ["google", "apple", "github"] as const;
const PERM_ACTIONS = ["create", "read", "update", "delete"] as const;

/**
 * API-level settings drawer — exposes every non-spatial operation (auth, roles,
 * permissions, features, env, meta) from the graph view. Each control emits a
 * validated operation through the same engine (so it's undoable); the panel is
 * driven by the live `spec`.
 */
export function GlobalSettings({
  spec,
  onApplyOperation,
  onClose,
}: {
  spec: ZeroAPISpec;
  onApplyOperation: ApplyOperation;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard");
  const [busy, setBusy] = useState(false);

  async function apply(
    type: string,
    params: Record<string, unknown>,
    opts?: { confirmed?: boolean },
  ): Promise<boolean> {
    setBusy(true);
    const res = await onApplyOperation({ type, params, confirmed: opts?.confirmed });
    setBusy(false);
    if (!res.ok) {
      toast.error("error" in res && res.error ? res.error : t("conversations.chat.errorOpRejected"));
      return false;
    }
    return true;
  }

  const jwtOn = Boolean(spec.auth?.jwt?.enabled);
  const apiKeyOn = Boolean(spec.auth?.apikey?.enabled);
  const oauthProviders = new Set((spec.auth?.oauth?.providers ?? []).map((p) => p.name));
  const roles = (spec.roles ?? []).map((r) => r.name);
  const resources = (spec.resources ?? []).map((r) => r.name);
  const uploadOn = Boolean(spec.features?.fileUpload?.enabled);
  const searchOn = Boolean(spec.features?.search?.enabled);

  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-black/20" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[360px] max-w-[90%] flex-col overflow-hidden border-l border-line bg-surface shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-[13.5px] font-semibold text-ink">{t("conversations.settings.title")}</span>
          <div className="flex items-center gap-2">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("conversations.settings.closeAriaLabel")}
              className="grid h-6 w-6 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 scrollbar-thin">
          {/* ── Méta ─────────────────────────────────────────────── */}
          <Section title={t("conversations.settings.sectionGeneral")}>
            <TextSave
              label={t("conversations.settings.fieldName")}
              initial={spec.name ?? ""}
              busy={busy}
              onSave={(v) => apply("setApiName", { name: v })}
            />
            <TextSave
              label={t("conversations.settings.fieldDescription")}
              initial={spec.description ?? ""}
              busy={busy}
              onSave={(v) => apply("setApiDescription", { description: v })}
            />
          </Section>

          {/* ── Auth ─────────────────────────────────────────────── */}
          <Section title={t("conversations.settings.sectionAuth")}>
            <Toggle
              label={t("conversations.settings.toggleJwt")}
              checked={jwtOn}
              busy={busy}
              onChange={(v) => (v ? apply("enableJwt", {}) : apply("disableJwt", {}, { confirmed: true }))}
            />
            <Toggle
              label={t("conversations.settings.toggleApiKey")}
              checked={apiKeyOn}
              busy={busy}
              onChange={(v) => (v ? apply("enableApiKey", {}) : apply("disableApiKey", {}))}
            />
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">OAuth</div>
            <div className="flex flex-wrap gap-1.5">
              {OAUTH_PROVIDERS.map((p) => (
                <Pill
                  key={p}
                  label={p}
                  active={oauthProviders.has(p)}
                  busy={busy}
                  onClick={() =>
                    oauthProviders.has(p)
                      ? apply("removeOAuthProvider", { provider: p })
                      : apply("addOAuthProvider", { provider: p })
                  }
                />
              ))}
            </div>
            <Toggle
              label={t("conversations.settings.toggleEmailVerification")}
              checked={Boolean(spec.auth?.emailVerification)}
              busy={busy}
              onChange={(v) => apply("setAuthFlag", { flag: "emailVerification", value: v })}
            />
            <Toggle
              label={t("conversations.settings.togglePasswordReset")}
              checked={Boolean(spec.auth?.passwordReset)}
              busy={busy}
              onChange={(v) => apply("setAuthFlag", { flag: "passwordReset", value: v })}
            />
          </Section>

          {/* ── Rôles ────────────────────────────────────────────── */}
          <Section title={t("conversations.settings.sectionRoles")}>
            <ChipList
              items={roles}
              busy={busy}
              placeholder={t("conversations.settings.rolePlaceholder")}
              onAdd={(name) => apply("addRole", { name })}
              onRemove={(name) => apply("removeRole", { name }, { confirmed: true })}
            />
          </Section>

          {/* ── Permissions ──────────────────────────────────────── */}
          {roles.length > 0 && resources.length > 0 && (
            <Section title={t("conversations.settings.sectionPermissions")}>
              {resources.map((resource) => (
                <PermissionResource
                  key={resource}
                  resource={resource}
                  roles={roles}
                  spec={spec}
                  busy={busy}
                  apply={apply}
                />
              ))}
            </Section>
          )}

          {/* ── Features ─────────────────────────────────────────── */}
          <Section title={t("conversations.settings.sectionFeatures")}>
            <Toggle
              label={t("conversations.settings.toggleFileUpload")}
              checked={uploadOn}
              busy={busy}
              onChange={(v) =>
                v ? apply("enableFileUpload", { provider: "local" }) : apply("disableFileUpload", {})
              }
            />
            <Toggle
              label={t("conversations.settings.toggleSearch")}
              checked={searchOn}
              busy={busy}
              onChange={(v) => apply("setSearch", { enabled: v })}
            />
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {t("conversations.settings.outboundWebhooks")}
            </div>
            <ChipList
              items={spec.features?.webhooks?.outbound ?? []}
              busy={busy}
              placeholder={t("conversations.settings.webhookOutboundPlaceholder")}
              onAdd={(event) => apply("addOutboundWebhook", { event })}
              onRemove={(event) => apply("removeOutboundWebhook", { event })}
            />
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {t("conversations.settings.inboundWebhooks")}
            </div>
            <ChipList
              items={spec.features?.webhooks?.inbound ?? []}
              busy={busy}
              placeholder={t("conversations.settings.webhookInboundPlaceholder")}
              onAdd={(source) => apply("addInboundWebhook", { source })}
              onRemove={(source) => apply("removeInboundWebhook", { source })}
            />
          </Section>

          {/* ── Env ──────────────────────────────────────────────── */}
          <Section title={t("conversations.settings.sectionEnv")}>
            <ChipList
              items={(spec.env ?? []).map((e) => e.name)}
              busy={busy}
              placeholder={t("conversations.settings.envPlaceholder")}
              onAdd={(name) => apply("addEnvVar", { name })}
              onRemove={(name) => apply("removeEnvVar", { name }, { confirmed: true })}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{title}</div>
      <div className="space-y-2 rounded-[12px] border border-line bg-bg-2/50 p-3">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  busy,
  onChange,
}: {
  label: string;
  checked: boolean;
  busy: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-[12.5px] text-ink-2">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={busy}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--accent)]"
      />
    </label>
  );
}

function Pill({
  label,
  active,
  busy,
  onClick,
}: {
  label: string;
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={
        "rounded-full px-2.5 py-1 font-mono text-[10.5px] transition disabled:opacity-50 " +
        (active
          ? "border border-accent/40 bg-accent-soft text-accent-ink"
          : "border border-line bg-surface text-muted hover:text-ink-2")
      }
    >
      {label}
    </button>
  );
}

function TextSave({
  label,
  initial,
  busy,
  onSave,
}: {
  label: string;
  initial: string;
  busy: boolean;
  onSave: (v: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(initial);
  const dirty = value.trim() !== initial.trim();
  return (
    <div>
      <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
          className="h-8 min-w-0 flex-1 rounded-[8px] border border-line bg-bg px-2.5 text-[12px] text-ink outline-none transition focus:border-ink disabled:opacity-50"
        />
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() => onSave(value.trim())}
          className="h-8 rounded-[8px] bg-ink px-3 text-[12px] font-medium text-bg transition disabled:opacity-40"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function ChipList({
  items,
  busy,
  placeholder,
  onAdd,
  onRemove,
}: {
  items: string[];
  busy: boolean;
  placeholder: string;
  onAdd: (v: string) => Promise<boolean>;
  onRemove: (v: string) => void;
}) {
  const t = useTranslations("dashboard");
  const [draft, setDraft] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 && <span className="text-[11px] text-muted">{t("conversations.settings.none")}</span>}
        {items.map((it) => (
          <span
            key={it}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[10.5px] text-ink-2"
          >
            {it}
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(it)}
              className="text-muted transition hover:text-danger disabled:opacity-50"
              aria-label={t("conversations.settings.removeAriaLabel", { name: it })}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              void onAdd(draft.trim()).then((ok) => ok && setDraft(""));
            }
          }}
          className="h-8 min-w-0 flex-1 rounded-[8px] border border-line bg-bg px-2.5 font-mono text-[11px] text-ink outline-none transition placeholder:text-muted-2 focus:border-ink disabled:opacity-50"
        />
        <button
          type="button"
          disabled={busy || !draft.trim()}
          onClick={() => void onAdd(draft.trim()).then((ok) => ok && setDraft(""))}
          className="grid h-8 w-8 place-items-center rounded-[8px] border border-line bg-surface text-ink-2 transition hover:border-accent/50 hover:text-accent-ink disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function PermissionResource({
  resource,
  roles,
  spec,
  busy,
  apply,
}: {
  resource: string;
  roles: string[];
  spec: ZeroAPISpec;
  busy: boolean;
  apply: (type: string, params: Record<string, unknown>, opts?: { confirmed?: boolean }) => Promise<boolean>;
}) {
  const perm = (spec.permissions ?? []).find((p) => p.resource === resource);
  const ruleFor = (role: string) => perm?.rules.find((r) => r.role === role);

  function setAction(role: string, action: string, on: boolean) {
    const rule = ruleFor(role);
    const current = new Set<string>(rule?.actions ?? []);
    if (on) current.add(action);
    else current.delete(action);
    const actions = [...current];
    const ownOnly = rule?.ownOnly ?? false;
    if (actions.length === 0 && !ownOnly) {
      void apply("removePermissionRule", { resource, role });
    } else {
      void apply("setPermissionRule", { resource, role, actions, ownOnly });
    }
  }

  function setOwnOnly(role: string, ownOnly: boolean) {
    const rule = ruleFor(role);
    const actions = rule?.actions ?? [];
    void apply("setPermissionRule", { resource, role, actions, ownOnly });
  }

  return (
    <div className="rounded-[10px] border border-line bg-surface p-2.5">
      <div className="mb-1.5 font-mono text-[11px] font-semibold text-ink">{resource}</div>
      <div className="space-y-1.5">
        {roles.map((role) => {
          const rule = ruleFor(role);
          const acts = new Set(rule?.actions ?? []);
          return (
            <div key={role} className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 truncate font-mono text-[10.5px] text-muted">{role}</span>
              {PERM_ACTIONS.map((a) => (
                <Pill
                  key={a}
                  label={a[0].toUpperCase()}
                  active={acts.has(a)}
                  busy={busy}
                  onClick={() => setAction(role, a, !acts.has(a))}
                />
              ))}
              <Pill
                label="own"
                active={Boolean(rule?.ownOnly)}
                busy={busy}
                onClick={() => setOwnOnly(role, !rule?.ownOnly)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
