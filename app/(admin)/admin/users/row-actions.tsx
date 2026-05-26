"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Shield, ShieldOff } from "lucide-react";
import { promoteUser, demoteUser } from "./actions";

export function UserRowActions({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: "USER" | "ADMIN";
}) {
  const [pending, start] = useTransition();

  function handle() {
    start(async () => {
      try {
        if (currentRole === "ADMIN") {
          await demoteUser(userId);
          toast.success("Rôle rétrogradé en USER.");
        } else {
          await promoteUser(userId);
          toast.success("Promu·e admin.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action impossible.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      title={currentRole === "ADMIN" ? "Rétrograder" : "Promouvoir admin"}
      className="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink disabled:opacity-50"
    >
      {currentRole === "ADMIN" ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
    </button>
  );
}
