"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteJob } from "@/app/(admin)/admin/jobs/actions";

export function JobRowActions({ jobId, name }: { jobId: string; name: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete() {
    if (!window.confirm(t("jobs.actions.confirmDelete", { name }))) return;
    start(async () => {
      try {
        await deleteJob(jobId);
        toast.success(t("jobs.actions.toastDeleted"));
        router.refresh();
      } catch {
        toast.error(t("jobs.actions.toastError"));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      aria-label={t("jobs.actions.delete")}
      title={t("jobs.actions.delete")}
      className="grid h-8 w-8 place-items-center rounded-[7px] border border-line text-muted transition hover:border-danger hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
