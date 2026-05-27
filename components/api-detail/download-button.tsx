"use client";

import { Download } from "lucide-react";

export function DownloadButton({ jobId, disabled }: { jobId: string; disabled?: boolean }) {
  function handle() {
    window.location.href = `/api/jobs/${jobId}/download`;
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-ink px-4 text-[14px] font-medium text-bg transition hover:-translate-y-px disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      Télécharger le ZIP
    </button>
  );
}
