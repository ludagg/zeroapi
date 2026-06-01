import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Width = "wide" | "default" | "narrow";

const WIDTH_CLASS: Record<Width, string> = {
  // Dense tables / data lists — full width (Supabase feel).
  wide: "max-w-none",
  // Detail pages — comfortable reading width (Vercel feel).
  default: "mx-auto max-w-7xl",
  // Forms / settings — narrow centred column.
  narrow: "mx-auto max-w-3xl",
};

/**
 * Standard scrollable page body for dashboard/admin routes.
 * Centralises the responsive padding and the content-width strategy.
 */
export function PageContainer({
  children,
  width = "default",
  className,
}: {
  children: ReactNode;
  width?: Width;
  className?: string;
}) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className={cn("px-4 py-6 sm:px-6 sm:py-7 lg:px-7", WIDTH_CLASS[width], className)}>
        {children}
      </div>
    </div>
  );
}
