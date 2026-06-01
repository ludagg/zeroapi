import { MessagesSquare, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  ConversationCard,
  type ConversationCardData,
} from "@/components/conversations/conversation-card";
import { NewConversationBox } from "@/components/conversations/new-conversation-box";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
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

      <PageContainer width="default">
        <PageHeader
          title={
            <>
              Tes <em>conversations</em>.
            </>
          }
          description={
            <>
              {cards.length} conversation{cards.length > 1 ? "s" : ""} · reprends là où tu en étais
            </>
          }
          actions={
            <Button href="/generate" variant="secondary" size="sm">
              <Plus className="h-3.5 w-3.5" />
              Avancé
            </Button>
          }
        />

        <NewConversationBox />

        <div className="mt-4">
          {cards.length === 0 ? (
            <EmptyState
              icon={<MessagesSquare className="h-5 w-5" />}
              title={
                <>
                  Aucune conversation <em>pour le moment</em>.
                </>
              }
              description="Commence par décrire ton API ↑"
              action={
                <Button href="/generate" variant="accent">
                  Démarrer
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((c) => (
                <ConversationCard key={c.id} data={c} />
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
