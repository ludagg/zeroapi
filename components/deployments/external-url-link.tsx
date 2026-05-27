"use client";

import { ExternalLink } from "lucide-react";

export function ExternalUrlLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate font-mono text-[11.5px] text-muted transition hover:text-ink"
    >
      <span className="truncate">{url}</span>
      <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
    </a>
  );
}
