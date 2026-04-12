"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MsgRole = "USER" | "ANDRE";

type ChatMessageRow = {
  id: string;
  role: MsgRole;
  content: string;
  createdAt: string;
};

type SessionRow = {
  id: string;
  subject: string | null;
  updatedAt: string;
  _count: { messages: number };
};

function formatSessionLabel(s: SessionRow) {
  const d = new Date(s.updatedAt);
  const title = s.subject?.trim() || "Conversation";
  return `${title} · ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
}

export function AndreChat() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/sessions");
      if (!res.ok) return;
      const data = (await res.json()) as { sessions?: SessionRow[] };
      setSessions(data.sessions ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const loadMessages = useCallback(async (sid: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${encodeURIComponent(sid)}`);
      if (!res.ok) {
        setError("Impossible de charger les messages.");
        return;
      }
      const data = (await res.json()) as { messages?: ChatMessageRow[] };
      setMessages(data.messages ?? []);
    } catch {
      setError("Impossible de charger les messages.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      void loadMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId, loadMessages]);

  useEffect(() => {
    scrollDown();
  }, [messages, streamText, scrollDown]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    setSending(true);
    setStreamText("");

    const userMsg: ChatMessageRow = {
      id: `local-${Date.now()}`,
      role: "USER",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });

      if (res.status === 503) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "André n’est pas disponible (clé API).");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Erreur serveur.");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }

      if (!res.body) {
        setError("Réponse vide.");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newSessionId = sessionId;
      let assistant = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const block of parts) {
          const line = block.trim();
          if (!line.startsWith("data: ")) continue;
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(line.slice(6)) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (payload.type === "session" && typeof payload.id === "string") {
            newSessionId = payload.id;
            setSessionId(payload.id);
          }
          if (payload.type === "delta" && typeof payload.text === "string") {
            assistant += payload.text;
            setStreamText(assistant);
          }
          if (payload.type === "error" && typeof payload.message === "string") {
            setError(payload.message);
          }
          if (payload.type === "done") {
            setStreamText("");
          }
        }
      }

      if (newSessionId) {
        await loadMessages(newSessionId);
        void loadSessions();
      }
    } catch {
      setError("Erreur réseau.");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setSending(false);
      setStreamText("");
    }
  }

  function newChat() {
    setSessionId(null);
    setMessages([]);
    setError(null);
    setStreamText("");
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      <aside className="flex w-full flex-col gap-3 rounded-[20px] border border-[var(--studelio-border)] bg-card p-4 shadow-[var(--studelio-shadow)] lg:max-w-xs lg:shrink-0">
        <Button type="button" variant="outline" className="w-full rounded-full" onClick={newChat}>
          Nouvelle conversation
        </Button>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Historique</p>
        {loadingList ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune conversation pour l’instant.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto lg:max-h-[min(28rem,calc(100vh-14rem))]">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSessionId(s.id)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    sessionId === s.id
                      ? "bg-[var(--studelio-blue-dim)] font-medium text-[var(--studelio-text)]"
                      : "text-[var(--studelio-text-body)] hover:bg-muted",
                  )}
                >
                  {formatSessionLabel(s)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="flex min-h-[420px] flex-1 flex-col rounded-[20px] border border-[var(--studelio-border)] bg-card shadow-[var(--studelio-shadow)]">
        <div className="border-b border-[var(--studelio-border)] px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">André</h2>
          <p className="text-xs text-muted-foreground">Prof de français — questions et indices, pas les réponses toutes faites.</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {loadingMessages ? (
            <p className="text-sm text-muted-foreground">Chargement des messages…</p>
          ) : messages.length === 0 && !streamText ? (
            <p className="text-sm text-[var(--studelio-text-body)]">
              Écris ta première question (ex. : une consigne de français, un passage que tu ne comprends pas, une
              difficulté en conjugaison…).
            </p>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "USER" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[min(100%,42rem)] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "USER"
                    ? "bg-[var(--studelio-blue)] text-primary-foreground"
                    : "border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)] text-[var(--studelio-text-body)]",
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}

          {streamText ? (
            <div className="flex justify-start">
              <div className="max-w-[min(100%,42rem)] rounded-2xl border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)] px-4 py-2.5 text-sm leading-relaxed text-[var(--studelio-text-body)]">
                <p className="whitespace-pre-wrap">{streamText}</p>
                <span className="mt-1 inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--studelio-blue)]" />
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        {error ? (
          <div className="border-t border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="border-t border-[var(--studelio-border)] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pose ta question à André…"
              rows={3}
              disabled={sending}
              className={cn(
                "min-h-[5rem] w-full flex-1 resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors",
                "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              type="button"
              className="rounded-full sm:shrink-0"
              disabled={sending || !input.trim()}
              onClick={() => void send()}
            >
              {sending ? "André réfléchit…" : "Envoyer"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Entrée pour envoyer · Maj+Entrée pour une ligne</p>
        </div>
      </div>
    </div>
  );
}
