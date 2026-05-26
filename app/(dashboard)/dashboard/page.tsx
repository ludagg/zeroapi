import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-serif text-[clamp(36px,4.6vw,50px)] leading-none">
        Bonsoir <em className="italic">{session.user.name?.split(" ")[0] ?? "toi"}</em>.
      </h1>
      <p className="mt-3 text-muted">
        Dashboard arrive à l&apos;étape 6 — pour l&apos;instant tu es bien authentifié·e.
      </p>
    </main>
  );
}
