import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listChannels, listMessages, sendMessage } from "@/lib/church/api";
import { useMe } from "@/lib/church/me-context";
import type { Channel, ChatMessage } from "@/lib/church/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/messages")({ component: MessagesPage });

function MessagesPage() {
  const me = useMe();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listChannels().then((rows) => {
      setChannels(rows);
      setActive(rows[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    listMessages({ data: active }).then(setMessages);
  }, [active]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const current = channels.find((c) => c.id === active);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!active || !body.trim()) return;
    const text = body;
    setBody("");
    await sendMessage({ data: { channelId: active, body: text } });
    const rows = await listMessages({ data: active });
    setMessages(rows);
  }

  return (
    <div>
      <PageHeader
        kicker="Connect"
        title="Messages"
        description="Channels for the whole church, your age group, and the teams you serve on. Not a second WhatsApp — a quieter room."
      />
      <div className="grid overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)] lg:grid-cols-[16rem_1fr]">
        <aside className="border-b border-border lg:border-r lg:border-b-0">
          <ul className="max-h-48 overflow-y-auto p-2 lg:max-h-[32rem]">
            {channels.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActive(c.id)}
                  className={cn(
                    "flex h-11 w-full items-center rounded-md px-3 text-left text-sm",
                    active === c.id ? "bg-primary text-primary-fg" : "hover:bg-secondary",
                  )}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="flex min-h-[24rem] flex-col">
          <header className="border-b border-border px-4 py-3">
            <p className="font-medium">{current?.name ?? "Choose a channel"}</p>
            <p className="text-xs text-muted capitalize">{current?.kind}</p>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => {
              const mine = m.userId === me.userId;
              return (
                <div key={m.id} className={cn("max-w-[85%]", mine && "ml-auto")}>
                  <p className="mb-1 text-[11px] text-muted">
                    {m.authorName}
                  </p>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                      mine ? "bg-primary text-primary-fg" : "bg-secondary",
                    )}
                  >
                    {m.body}
                  </div>
                </div>
              );
            })}
            <div ref={end} />
          </div>
          <form onSubmit={onSend} className="flex gap-2 border-t border-border p-3">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a note to this room"
            />
            <Button type="submit">Send</Button>
          </form>
        </section>
      </div>
    </div>
  );
}
