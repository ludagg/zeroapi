import { ChatInterface } from "@/components/generate/chat-interface";
import { initials, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  const user = await requireUser();
  return (
    <ChatInterface
      user={{
        name: user.name,
        email: user.email,
        initials: initials(user.name ?? user.email, "??"),
      }}
    />
  );
}
