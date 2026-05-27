import Link from "next/link";
import { MessagesSquare, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  ConversationCard,
  type ConversationCardData,
} from "@/components/conversations/conversation-card";
import { NewConversationBox } from "@/components/conversations/new-conversation-box";
import { lastMessageExcerpt, parseMessages } from "@/lib/conversation-helpers";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const user = await requireUser();

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { job: { select: { id: true, name: true, status: true } } },
  });
  console.log("conversations:", conversations.length);

  const cards: ConversationCardData[] = conversations.map((c) => {
    const messages = parseMessages(c.messages);
    return {
      id: c.id,
      title: c.title,
      lastMessage: lastMessageExcerpt(messages),
      messagesCount: messages.length,
      updatedAt: c.updatedAt.toISOString(),
      job: c.job ?? null,
    };
  });

  return (
    <>
      <DashboardHeader
        crumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Conversations" },
        ]}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-7">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] sm:text-[44px] sm:leading-none">
                Tes <em className="italic">conversations</em>.
              </h1>
              <p className="mt-2 text-[14.5px] text-muted">
                {cards.length} conversation{cards.length > 1 ? "s" : ""} · reprends là où tu en
                étais
              </p>
            </div>
            <Link
              href="/generate"
              className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-2 transition hover:-translate-y-px hover:border-line-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Avancé
            </Link>
          </header>

          <NewConversationBox />

          {cards.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-line-2 bg-surface px-6 py-12 text-center">
              <MessagesSquare className="mx-auto mb-3 h-5 w-5 text-muted-2" />
              <p className="font-serif text-[26px] leading-tight">
                Aucune conversation <em className="italic">pour le moment</em>.
              </p>
              <p className="mt-2 text-muted">
                Commence par décrire ton API ↑
              </p>
              <Link href="/generate" className="btn-primary-accent mt-5 inline-flex">
                Démarrer
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((c) => (
                <div key={c.id} className="group">
                  <ConversationCard data={c} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
