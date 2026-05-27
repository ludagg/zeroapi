"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ListChecks, Send, ShieldCheck } from "lucide-react";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { JobStatus } from "@prisma/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileDrawer } from "@/components/ui/mobile-drawer";
import { Markdown } from "@/components/generate/markdown";
import { EditableTitle } from "@/components/conversations/editable-title";
import { SpecSidebar } from "@/components/conversations/spec-sidebar";
import { computeInsights, type ChatMessage } from "@/lib/conversation-helpers";
import { toast } from "sonner";
import Link from "next/link";

type Message = ChatMessage & {
  id: string;
  streaming?: boolean;
};

export function ConversationChat({
  conversationId,
  initialTitle,
  initialMessages,
  spec,
  job,
  user,
}: {
  conversationId: string;
  initialTitle: string;
  initialMessages: ChatMessage[];
  spec: ZeroAPISpec | null;
  job: { id: string; name: string; status: JobStatus } | null;
  user: { name: string | null; email: string; initials: string };
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(() =>
    initialMessages.map((m, i) => ({ ...m, id: `seed-${i}-${m.ts ?? 0}` })),
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const needsInitialReply = useTrigger(
    initialMessages.length === 1 && initialMessages[0].role === "user",
  );
  const titleRegenAttempted = useRef(false);
  const initialAssistantCount = useRef(
    initialMessages.filter((m) => m.role === "assistant").length,
  );

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (needsInitialReply) {
      void streamReply();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsInitialReply]);

  const insights = computeInsights(
    messages.map((m) => ({ role: m.role, content: m.content })),
    spec,
  );
  const canSend = draft.trim().length > 0 && !pending;

  async function streamReply() {
    // Replay the latest assistant turn for the LAST user message that's
    // already persisted (case: conversation was just created and the only
    // message is the user's seed).
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    await runStream({ content: lastUser.content, replay: true });
  }

  async function send(text: string) {
    if (!text.trim() || pending) return;
    setDraft("");
    await runStream({ content: text.trim() });
  }

  async function runStream({
    content,
    replay,
  }: {
    content: string;
    replay?: boolean;
  }) {
    const userId = `u-${Date.now()}`;
    const assistantId = `a-${Date.now()}`;
    setPending(true);

    setMessages((m) => {
      const next: Message[] = replay
        ? [...m]
        : [
            ...m,
            {
              id: userId,
              role: "user",
              content,
              ts: Date.now(),
            },
          ];
      next.push({
        id: assistantId,
        role: "assistant",
        content: "",
        ts: Date.now(),
        streaming: true,
      });
      return next;
    });

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, replay: replay ?? false }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Erreur de génération.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let errorMessage: string | null = null;

      streamLoop: while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          let event: {
            type: string;
            text?: string;
            provider?: string;
            model?: string;
            error?: string;
          };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "meta") {
            const meta = `${event.provider} · ${event.model}`;
            setMessages((m) =>
              m.map((msg) => (msg.id === assistantId ? { ...msg, meta } : msg)),
            );
          } else if (event.type === "chunk" && event.text) {
            const chunk = event.text;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + chunk }
                  : msg,
              ),
            );
          } else if (event.type === "error") {
            errorMessage = event.error ?? "Erreur de stream.";
            break streamLoop;
          }
        }
      }
      setMessages((m) =>
        m
          .filter((msg) => msg.id !== assistantId || msg.content.length > 0)
          .map((msg) => (msg.id === assistantId ? { ...msg, streaming: false } : msg)),
      );
      if (errorMessage) throw new Error(errorMessage);

      // Once per session, after the very first assistant reply arrives, ask
      // the server to generate a real title from the conversation.
      if (initialAssistantCount.current === 0 && !titleRegenAttempted.current) {
        titleRegenAttempted.current = true;
        void fetch(`/api/conversations/${conversationId}/title`, { method: "POST" })
          .then(() => router.refresh())
          .catch(() => undefined);
      }
    } catch (err) {
      setMessages((m) =>
        m
          .filter((msg) => msg.id !== assistantId || msg.content.length > 0)
          .map((msg) => (msg.id === assistantId ? { ...msg, streaming: false } : msg)),
      );
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-h-0 min-w-0 flex-col bg-bg">
        <header className="flex h-[60px] flex-shrink-0 items-center gap-2 border-b border-line bg-bg px-4 sm:gap-3 sm:px-6">
          <Link
            href="/conversations"
            aria-label="Toutes les conversations"
            className="inline-flex items-center gap-2 rounded-[9px] px-2 py-1.5 text-[13px] text-muted transition hover:bg-bg-2 hover:text-ink sm:px-2.5"
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="hidden sm:inline">Conversations</span>
          </Link>

          <div className="min-w-0 flex-1 sm:ml-2">
            <div className="flex items-center gap-1.5 truncate text-[13.5px] font-medium">
              <ShieldCheck className="hidden h-3 w-3 text-muted sm:block" />
              <EditableTitle id={conversationId} initialTitle={initialTitle} />
            </div>
            <div className="hidden font-mono text-[10.5px] uppercase tracking-[0.04em] text-muted sm:block">
              {job ? `liée au job · ${job.name}` : "brouillon · auto-save"}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSpecOpen(true)}
              aria-label="Voir la spec"
              className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-line bg-surface px-2.5 text-[12px] font-medium text-ink-2 transition hover:border-line-2 lg:hidden"
            >
              <ListChecks className="h-[15px] w-[15px]" />
              <span className="font-mono text-[11px] tracking-[0.04em]">
                {insights.confidence}%
              </span>
            </button>
            <ThemeToggle className="hidden sm:grid" />
          </div>
        </header>

        <div ref={threadRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 pb-6 pt-6 sm:gap-7 sm:px-6 sm:pt-8">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} userInitials={user.initials} />
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 bg-gradient-to-t from-bg via-bg/85 to-transparent px-3 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-3.5">
          <div className="mx-auto max-w-[760px]">
            <div className="rounded-[16px] border border-line bg-surface shadow-md transition focus-within:border-ink">
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 180) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) void send(draft);
                  }
                }}
                rows={1}
                placeholder={
                  job
                    ? "Demande une modification…"
                    : "Continue à décrire, demande des changements…"
                }
                className="block min-h-12 w-full resize-none rounded-t-[16px] border-0 bg-transparent px-4 pb-1.5 pt-3.5 text-[15px] leading-snug text-ink outline-none placeholder:text-muted-2"
              />
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <span className="px-2 font-mono text-[10.5px] tracking-[0.03em] text-muted">
                  {job ? "mode modification · diff avant régénération" : "mode création"}
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10.5px] tracking-[0.04em] text-muted-2">
                    <kbd className="rounded-[4px] border border-line bg-bg px-1.5 py-px font-mono">
                      ⏎
                    </kbd>{" "}
                    envoyer
                  </span>
                  <button
                    type="button"
                    aria-label="Envoyer"
                    disabled={!canSend}
                    onClick={() => send(draft)}
                    className={
                      "grid h-[34px] w-[34px] place-items-center rounded-[9px] transition disabled:opacity-35 " +
                      (canSend
                        ? "bg-accent text-accent-ink hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
                        : "bg-ink text-bg")
                    }
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SpecSidebar
        conversationId={conversationId}
        messages={messages.map((m) => ({ role: m.role, content: m.content }))}
        spec={spec}
        jobId={job?.id ?? null}
        variant="desktop"
        pending={pending}
      />

      <MobileDrawer
        open={specOpen}
        onClose={() => setSpecOpen(false)}
        side="right"
        width={340}
        label="Spec en cours"
        className="bg-bg-2"
      >
        <SpecSidebar
          conversationId={conversationId}
          messages={messages.map((m) => ({ role: m.role, content: m.content }))}
          spec={spec}
          jobId={job?.id ?? null}
          variant="drawer"
          pending={pending}
          onLaunch={() => setSpecOpen(false)}
        />
      </MobileDrawer>
    </div>
  );
}

/**
 * Returns true only on first render when `cond` is true. Used to fire a
 * one-shot effect for the initial assistant reply without re-firing when
 * messages change.
 */
function useTrigger(cond: boolean): boolean {
  const ref = useRef(cond);
  return ref.current;
}

function Bubble({
  message,
  userInitials,
}: {
  message: Message;
  userInitials: string;
}) {
  if (message.role === "user") {
    return (
      <div className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3.5">
        <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-[8px] bg-gradient-to-br from-[#2A6FDB] to-accent font-mono text-[12px] font-semibold text-accent-ink">
          {userInitials}
        </div>
        <div>
          <div className="mb-2 text-[12.5px] text-muted">
            <b className="font-medium text-ink">Toi</b>
          </div>
          <div className="rounded-[12px] border border-line bg-bg-2 px-4 py-3.5 text-[15px] leading-snug text-ink">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  const empty = message.content.trim().length === 0;
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3.5">
      <span className="brand-mark mt-0.5 h-8 w-8 text-[12px]">
        <span>0</span>
      </span>
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
          <b className="font-medium text-ink">ZeroAPI</b>
          {message.streaming ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-accent-ink">
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
                style={{ boxShadow: "0 0 0 3px var(--accent-glow)" }}
              />
              en train d&apos;écrire
            </span>
          ) : (
            message.meta && (
              <span className="rounded-[4px] border border-line bg-bg-2 px-1.5 py-px font-mono text-[10px] tracking-[0.04em]">
                {message.meta}
              </span>
            )
          )}
        </div>
        {empty && message.streaming ? (
          <div className="flex gap-1 py-2">
            <i className="block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-2" />
            <i
              className="block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-2"
              style={{ animationDelay: ".15s" }}
            />
            <i
              className="block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-2"
              style={{ animationDelay: ".3s" }}
            />
          </div>
        ) : (
          <div className="min-w-0 space-y-3 text-[15px] leading-relaxed text-ink-2">
            <Markdown content={message.content} />
            {message.streaming && (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-accent align-middle"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
