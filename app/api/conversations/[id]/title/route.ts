import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { routeLLM } from "@/lib/llm-router";
import { parseMessages, TITLE_SYSTEM_PROMPT, provisionalTitle } from "@/lib/conversation-helpers";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  const messages = parseMessages(conv.messages);
  const userMsg = messages.find((m) => m.role === "user");
  if (!userMsg) {
    return NextResponse.json({ error: "Aucun message utilisateur." }, { status: 400 });
  }

  // Fallback used if the LLM call fails for any reason.
  const fallback = provisionalTitle(userMsg.content);

  let title = fallback;
  try {
    const res = await routeLLM("conversation", user.plan, {
      messages: [
        { role: "system", content: TITLE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Voici la première description :\n\n${userMsg.content.slice(0, 600)}`,
        },
      ],
      maxTokens: 40,
      temperature: 0.4,
    });
    const cleaned = res.content
      .replace(/^["']|["']$/g, "")
      .replace(/\.+$/g, "")
      .trim();
    if (cleaned.length >= 2 && cleaned.length <= 80) {
      title = cleaned;
    }
  } catch {
    // keep fallback
  }

  await prisma.conversation.update({
    where: { id: conv.id },
    data: { title },
  });

  return NextResponse.json({ title });
}
