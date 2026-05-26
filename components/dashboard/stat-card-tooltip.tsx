"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

export function StatCardTooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className="cursor-help">{children}</div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 max-w-[260px] rounded-[8px] border border-line bg-surface px-3 py-2 text-[12.5px] text-ink-2 shadow-md data-[state=delayed-open]:animate-fade-in"
          >
            {content}
            <Tooltip.Arrow className="fill-[var(--surface)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
