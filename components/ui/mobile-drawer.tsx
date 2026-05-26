"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  label?: string;
  children: React.ReactNode;
  /** width of the drawer panel in px (default 300) */
  width?: number;
  /** className appended to the panel */
  className?: string;
};

export function MobileDrawer({
  open,
  onClose,
  side = "left",
  label,
  children,
  width = 300,
  className,
}: MobileDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        tabIndex={open ? 0 : -1}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "absolute top-0 bottom-0 flex max-w-[90vw] flex-col bg-bg shadow-lg transition-transform duration-300 ease-out",
          side === "left" ? "left-0 border-r border-line" : "right-0 border-l border-line",
          open
            ? "translate-x-0"
            : side === "left"
              ? "-translate-x-full"
              : "translate-x-full",
          className,
        )}
        style={{ width: `${width}px` }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-[9px] border border-line bg-surface text-ink-2 transition hover:border-line-2"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </aside>
    </div>,
    document.body,
  );
}
