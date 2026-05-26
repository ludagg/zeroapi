import { Sidebar } from "@/components/dashboard/sidebar";
import { initials, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="grid h-screen grid-cols-1 overflow-hidden bg-bg-2 lg:grid-cols-[248px_1fr]">
      <Sidebar
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
          generationsUsed: user.generationsUsed,
          generationsLimit: user.generationsLimit,
          initials: initials(user.name ?? user.email, "??"),
        }}
      />
      <div className="flex h-screen flex-col overflow-hidden bg-bg-2">{children}</div>
    </div>
  );
}
