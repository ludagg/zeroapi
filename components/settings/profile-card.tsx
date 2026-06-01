"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, User } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(80),
});
type Values = z.infer<typeof schema>;

export function ProfileCard({
  initial,
  email,
}: {
  initial: { name: string };
  email: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    setSaved(false);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Enregistrement impossible.");
      }
      setSaved(true);
      toast.success("Profil mis à jour.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsCard
      title="Profil"
      subtitle="Ton nom apparaît dans la sidebar et sur les emails de notification."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          label="Nom complet"
          type="text"
          autoComplete="name"
          icon={<User />}
          error={errors.name?.message}
          {...register("name")}
        />

        <FormField
          label="Email"
          type="email"
          value={email}
          disabled
          readOnly
          className="cursor-not-allowed opacity-70"
          hint="L'email ne peut pas être modifié pour le moment."
        />

        <div className="flex items-center justify-end gap-3">
          {saved && !isDirty && (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-accent-ink">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Enregistré
            </span>
          )}
          <Button type="submit" size="sm" disabled={submitting || !isDirty}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}

export function SettingsCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}
