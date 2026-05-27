"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Check, Copy, Mail, MessageCircle, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { Plan } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PLAN_LIMITS, PLAN_ORDER } from "@/lib/plans";

type Props = {
  currentPlan: Plan;
  email: string;
  whatsappUrl?: string;
  contactEmail?: string;
  /** Optional trigger override — defaults to a "Passer à un plan supérieur" button. */
  children?: React.ReactNode;
  /** When provided, opens the modal pre-targeted at this plan. */
  defaultTarget?: Plan;
};

const FALLBACK_EMAIL = "bonjour@zeroapi.app";

export function UpgradeModal({
  currentPlan,
  email,
  whatsappUrl,
  contactEmail,
  children,
  defaultTarget,
}: Props) {
  const upgradableTargets = PLAN_ORDER.filter(
    (p) => PLAN_LIMITS[p].priceEUR > PLAN_LIMITS[currentPlan].priceEUR,
  );
  const initialTarget =
    defaultTarget && upgradableTargets.includes(defaultTarget)
      ? defaultTarget
      : upgradableTargets[0] ?? null;

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Plan | null>(initialTarget);
  const resolvedEmail = contactEmail ?? FALLBACK_EMAIL;

  // BUSINESS users have nothing to upgrade to.
  if (!initialTarget) return null;

  const subject = encodeURIComponent(
    `Upgrade ZeroAPI — ${currentPlan} → ${target ?? "Pro"}`,
  );
  const body = encodeURIComponent(
    `Bonjour,\n\n` +
      `Je veux passer mon compte (${email}) au plan ${target ?? "Pro"}.\n\n` +
      `Mode de paiement préféré : ____\n` +
      `Notes : ____\n\nMerci !`,
  );
  const mailto = `mailto:${resolvedEmail}?subject=${subject}&body=${body}`;

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(resolvedEmail);
      toast.success("Adresse copiée.");
    } catch {
      toast.error("Copie impossible.");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {children ?? (
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-ink px-3.5 text-[13px] font-medium text-bg transition hover:-translate-y-px"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Passer à un plan supérieur
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] border border-line bg-surface shadow-lg data-[state=open]:animate-fade-in">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <Dialog.Title className="text-[16px] font-medium tracking-tight">
                Passer à un plan supérieur
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[12.5px] text-muted">
                On t&apos;active manuellement en moins de 24 h. Pas de carte requise tout de suite.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fermer"
              className="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </Dialog.Close>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Vers quel plan ?
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {upgradableTargets.map((p) => {
                  const info = PLAN_LIMITS[p];
                  const active = target === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTarget(p)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-[10px] border px-3 py-2.5 text-left transition",
                        active
                          ? "border-ink bg-bg-2"
                          : "border-line hover:border-line-2 hover:bg-bg-2/40",
                      )}
                    >
                      <span className="flex w-full items-center justify-between">
                        <span className="text-[13.5px] font-medium">{info.label}</span>
                        {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className="font-mono text-[10.5px] text-muted">
                        {info.generationsPerDay} gén/jour · {info.priceEUR}€/mo
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Contacte-nous
              </div>
              <div className="grid gap-2">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-[10px] border border-line bg-surface px-3 py-2.5 transition hover:-translate-y-px hover:border-line-2"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#25D366] text-white">
                      <MessageCircle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium">WhatsApp</div>
                      <div className="font-mono text-[10.5px] text-muted">
                        Réponse en quelques minutes
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted" />
                  </a>
                )}
                <a
                  href={mailto}
                  className="flex items-center gap-3 rounded-[10px] border border-line bg-surface px-3 py-2.5 transition hover:-translate-y-px hover:border-line-2"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-ink text-bg">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium">Email</div>
                    <div className="truncate font-mono text-[10.5px] text-muted">
                      {resolvedEmail}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      copyEmail();
                    }}
                    aria-label="Copier l'adresse email"
                    className="grid h-7 w-7 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </a>
              </div>
            </div>

            <div className="rounded-[10px] bg-bg-2 px-3 py-2.5 text-[12px] leading-relaxed text-muted">
              On accepte le virement bancaire, le Mobile Money (Orange · Wave · MTN ·
              Moov) et les cartes via lien Stripe à la demande. Indique-nous ton mode
              préféré dans le message.
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
