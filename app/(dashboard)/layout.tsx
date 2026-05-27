import { DashboardShell } from "@/components/dashboard/shell";
import { CommandPalette } from "@/components/command-palette";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";
import { initials, requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const [account, recentJobs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true, email: true },
    }),
    prisma.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true },
    }),
  ]);

  const showVerifyBanner = account ? !account.emailVerified : false;

  return (
    <div className="grid h-screen grid-cols-1 overflow-hidden bg-bg-2 lg:grid-cols-[248px_1fr]">
      <DashboardShell
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
          generationsUsed: user.generationsUsed,
          generationsLimit: user.generationsLimit,
          initials: initials(user.name ?? user.email, "??"),
        }}
      >
        {showVerifyBanner && account && <VerifyEmailBanner email={account.email} />}
        {children}
      </DashboardShell>
      <CommandPalette isAdmin={user.role === "ADMIN"} recentJobs={recentJobs} />
    </div>
  );
}
