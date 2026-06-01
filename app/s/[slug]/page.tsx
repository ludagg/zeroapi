import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSpec } from "@/lib/conversation-helpers";
import { PublicSpecView } from "@/components/conversations/public-spec-view";
import { BrandMark } from "@/components/brand-mark";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const conv = await prisma.conversation.findFirst({
    where: { shareSlug: slug },
    select: { title: true, spec: true },
  });
  if (!conv) return null;
  return { title: conv.title, spec: readSpec(conv.spec ?? null) };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await load(params.slug);
  const name = data?.spec?.name ?? data?.title ?? "API";
  return {
    title: `${name} · ZeroAPI`,
    description: "Spec d'API partagée — graphe, endpoints et structure (lecture seule).",
    robots: { index: false, follow: false },
  };
}

export default async function SharedSpecPage({ params }: { params: { slug: string } }) {
  const data = await load(params.slug);
  if (!data) notFound();

  const apiName = data.spec?.name ?? data.title;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg-2">
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-line bg-bg px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark size={26} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-ink">{apiName}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              partagé · lecture seule
            </div>
          </div>
        </div>
        <Link
          href="/register"
          className="inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-[9px] bg-accent px-3.5 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
        >
          Crée ton API
        </Link>
      </header>

      {data.spec && data.spec.resources.length > 0 ? (
        <PublicSpecView spec={data.spec} />
      ) : (
        <div className="grid flex-1 place-items-center p-8 text-center text-[13px] text-muted">
          Cette spec est encore vide.
        </div>
      )}
    </div>
  );
}
