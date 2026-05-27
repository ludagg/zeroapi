import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { initials, requireUser } from "@/lib/session";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { parseMessages, readSpec } from "@/lib/conversation-helpers";

export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    include: { job: { select: { id: true, name: true, status: true } } },
  });
  if (!conv) notFound();

  const messages = parseMessages(conv.messages);
  const spec = readSpec(conv.spec ?? null);

  return (
    <ConversationChat
      conversationId={conv.id}
      initialTitle={conv.title}
      initialMessages={messages}
      spec={spec}
      job={conv.job ?? null}
      user={{
        name: user.name,
        email: user.email,
        initials: initials(user.name ?? user.email, "??"),
      }}
    />
  );
}
