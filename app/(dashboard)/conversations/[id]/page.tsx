import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { initials, requireUser } from "@/lib/session";
import { ConversationChat } from "@/components/conversations/conversation-chat";
import { parseMessages, readSpec } from "@/lib/conversation-helpers";
import { parseHistory, historyTimeline } from "@/lib/conversation-history";

export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      job: {
        select: {
          id: true,
          name: true,
          status: true,
          visibility: true,
          spec: true,
          deployment: { select: { status: true } },
        },
      },
    },
  });
  if (!conv) notFound();

  const messages = parseMessages(conv.messages);
  const spec = readSpec(conv.spec ?? null);
  const historyEntries = historyTimeline(parseHistory(conv.specHistory));

  // The spec as it was at the last save — used to detect unsaved spec changes.
  const savedSpec = conv.job ? readSpec(conv.job.spec ?? null) : null;
  // A live deployment exists if the job is online or rolling out.
  const deployStatus = conv.job?.deployment?.status;
  const hasActiveDeployment = deployStatus === "ONLINE" || deployStatus === "DEPLOYING";

  return (
    <ConversationChat
      conversationId={conv.id}
      initialTitle={conv.title}
      initialMessages={messages}
      spec={spec}
      initialVersion={conv.specVersion}
      initialHistory={historyEntries}
      initialShareSlug={conv.shareSlug ?? null}
      job={
        conv.job
          ? { id: conv.job.id, name: conv.job.name, status: conv.job.status, visibility: conv.job.visibility }
          : null
      }
      savedSpec={savedSpec}
      hasActiveDeployment={hasActiveDeployment}
      user={{
        name: user.name,
        email: user.email,
        initials: initials(user.name ?? user.email, "??"),
      }}
    />
  );
}
