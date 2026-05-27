"use client";

import { Download } from "lucide-react";

export function ExportButton({
  jobId,
  disabled,
}: {
  jobId: string;
  disabled?: boolean;
}) {
  function handle() {
    window.location.href = `/api/jobs/${jobId}/download`;
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 text-[13px] font-medium text-ink transition hover:-translate-y-px hover:border-line-2 disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
      Exporter
    </button>
  );
}
