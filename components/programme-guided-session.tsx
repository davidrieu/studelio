"use client";

import { BookMarked, Info, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/chat-markdown";
import { previewWithoutMetaTail } from "@/lib/programme-guided-meta";
import { IconTooltipAction } from "@/components/icon-tooltip-action";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProgrammeSeanceContextBanner = {
  programmeTitle: string;
  niveauLabel: string;
  sourceDetail: string;
};

const STORAGE_KEY = "studelio.programmeGuidedSessionId";

type MsgRole = "USER" | "ANDRE";

type ChatMessageRow = {
  id: string;
  role: MsgRole;
  content: string;
  createdAt: string;
};

async function consumeChatStream(
  res: Response,
  handlers: {
    onSession: (id: string) => void;
    onDelta: (text: string) => void;
    onError: (message: string) => void;
    onDone: () => void;
  },
): Promise<{ assistant: string; receivedDone: boolean; streamError: string | null }> {
  if (!res.body) throw new Error("empty body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistant = "";
  let receivedDone = false;
  let streamError: string | null = null;

  const handlePayload = (payload: Record<string, unknown>) => {
    if (payload.type === "session" && typeof payload.id === "string") {
      handlers.onSession(payload.id);
    }
    if (payload.type === "delta" && typeof payload.text === "string") {
      assistant += payload.text;
      handlers.onDelta(assistant);
    }
    if (payload.type === "error" && typeof payload.message === "string") {
      streamError = payload.message;
      handlers.onError(payload.message);
    }
    if (payload.type === "done") {
      receivedDone = true;
      handlers.onDone();
    }
  };

  const parseDataLine = (line: string) => {
    const t = line.trim();
    if (!t.startsWith("data: ")) return;
    try {
      handlePayload(JSON.parse(t.slice(6)) as Record<string, unknown>);
    } catch {
      /* ignore */
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const block of parts) {
      parseDataLine(block);
    }
    if (done) break;
  }
  for (const line of buffer.split("\n")) {
    parseDataLine(line);
  }

  return { assistant, receivedDone, streamError };
}

type SessionProps = {
  contextBanner: ProgrammeSeanceContextBanner;
};

export function ProgrammeGuidedSession({ contextBanner }: SessionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [input, setInput] = useState("");
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const userHasReplied = useMemo(() => messages.some((m) => m.role === "USER"), [messages]);

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadMessages = useCallback(async (sid: string): Promise<number> => {
    setLoadingMessages(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${encodeURIComponent(sid)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        sessionStorage.removeItem(STORAGE_KEY);
        setError("Séance introuvable — on repart à zéro.");
        setSessionId(null);
        return 0;
      }
      const data = (await res.json()) as { messages?: ChatMessageRow[] };
      const list = data.messages ?? [];
      setMessages(list);
      return list.length;
    } catch {
      setError("Impossible de charger la séance.");
      return 0;
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const runBootstrap = useCallback(async () => {
    setError(null);
    setStreamText("");
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "programme_guided", bootstrap: true }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Erreur au démarrage.");
        return;
      }

      let newId: string | null = null;
      const { assistant, receivedDone, streamError } = await consumeChatStream(res, {
        onSession: (id) => {
          newId = id;
          setSessionId(id);
          sessionStorage.setItem(STORAGE_KEY, id);
        },
        onDelta: (a) => setStreamText(a),
        onError: (m) => setError(m),
        onDone: () => {},
      });

      if (!receivedDone && !streamError && !assistant) {
        setError(
          "La connexion s’est interrompue. Réessaie (souvent lié au temps limite sur Vercel Hobby).",
        );
      }

      if (newId) {
        await loadMessages(newId);
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSending(false);
      setStreamText("");
      setBootstrapping(false);
    }
  }, [loadMessages]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSessionId(stored);
        const n = await loadMessages(stored);
        if (n === 0) {
          sessionStorage.removeItem(STORAGE_KEY);
          setSessionId(null);
          await runBootstrap();
        } else {
          setBootstrapping(false);
        }
      } else {
        await runBootstrap();
      }
    })();
  }, [loadMessages, runBootstrap]);

  useEffect(() => {
    scrollDown();
  }, [messages, streamText, scrollDown]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !sessionId) return;
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "programme_guided", sessionId, message: text }),
      });

      if (res.status === 503) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "André n’est pas disponible.");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Erreur serveur.");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }

      const { assistant, receivedDone, streamError } = await consumeChatStream(res, {
        onSession: () => {},
        onDelta: (a) => setStreamText(a),
        onError: (m) => setError(m),
        onDone: () => {},
      });

      if (!receivedDone && !streamError && !assistant) {
        setError("Réponse incomplète — réessaie.");
      }

      await loadMessages(sessionId);
    } catch {
      setError("Erreur réseau.");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setSending(false);
      setStreamText("");
    }
  }

  function newSession() {
    sessionStorage.removeItem(STORAGE_KEY);
    setSessionId(null);
    setMessages([]);
    setError(null);
    setStreamText("");
    setBootstrapping(true);
    void runBootstrap();
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col rounded-[20px] border border-[var(--studelio-border)] bg-gradient-to-b from-[var(--studelio-bg-soft)] to-card shadow-[var(--studelio-shadow)]">
      <header className="border-b border-[var(--studelio-border)] px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold text-[var(--studelio-text)]">Séance programme</p>
            <p className="text-xs text-muted-foreground">
              André mène : plan, exercices et difficulté s’adaptent à toi. Réponds aux consignes — tu ne choisis pas le
              thème.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <IconTooltipAction label="Nouvelle séance">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full"
                aria-label="Nouvelle séance"
                onClick={() => newSession()}
              >
                <Sparkles className="size-4" />
              </Button>
            </IconTooltipAction>
            <IconTooltipAction label="Mon parcours (radar & chapitres)">
              <Link
                href="/app/programme"
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon" }),
                  "inline-flex rounded-full text-[var(--studelio-text-body)]",
                )}
                aria-label="Mon parcours — radar et chapitres"
              >
                <BookMarked className="size-4" />
              </Link>
            </IconTooltipAction>
            <IconTooltipAction label="Chat libre avec André">
              <Link
                href="/app/andre"
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon" }),
                  "inline-flex rounded-full text-[var(--studelio-text-body)]",
                )}
                aria-label="Chat libre avec André"
              >
                <MessageCircle className="size-4" />
              </Link>
            </IconTooltipAction>
          </div>
        </div>
      </header>

      {contextBanner && !userHasReplied ? (
        <div className="border-b border-[var(--studelio-border)]/60 bg-gradient-to-r from-[var(--studelio-blue-dim)]/35 via-transparent to-transparent px-4 py-2.5 sm:px-6">
          <div
            className="flex gap-2.5 rounded-xl border border-[var(--studelio-border)]/50 bg-card/70 px-3 py-2 shadow-sm backdrop-blur-sm"
            role="status"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-[var(--studelio-blue)] opacity-90" aria-hidden />
            <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">
              <span className="font-medium text-[var(--studelio-text)]">Référence de cette séance · </span>
              « {contextBanner.programmeTitle} » ({contextBanner.niveauLabel}). André s’appuie sur{" "}
              <span className="font-medium text-[var(--studelio-text-body)]">{contextBanner.sourceDetail}</span>.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-8">
          {bootstrapping || loadingMessages ? (
            <p className="text-sm text-muted-foreground">Préparation de ta séance…</p>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "USER" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[min(100%,40rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "USER"
                    ? "bg-[var(--studelio-blue)] text-primary-foreground"
                    : "border border-[var(--studelio-border)] bg-card text-[var(--studelio-text-body)] shadow-sm",
                )}
              >
                {m.role === "ANDRE" ? (
                  <ChatMarkdown content={m.role === "ANDRE" ? previewWithoutMetaTail(m.content) : m.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}

          {streamText ? (
            <div className="flex justify-start">
              <div className="max-w-[min(100%,40rem)] rounded-2xl border border-[var(--studelio-border)] bg-card px-4 py-3 text-sm leading-relaxed text-[var(--studelio-text-body)] shadow-sm">
                <ChatMarkdown content={previewWithoutMetaTail(streamText)} />
                <span className="mt-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--studelio-blue)]" />
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        {error ? (
          <div className="border-t border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive sm:px-8">
            {error}
          </div>
        ) : null}

        <div className="border-t border-[var(--studelio-border)] bg-card/80 px-4 py-4 backdrop-blur sm:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Réponds à l’exercice d’André (pas besoin de choisir un thème)…"
              rows={3}
              disabled={sending || bootstrapping || !sessionId}
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
              disabled={sending || bootstrapping || !sessionId || !input.trim()}
              onClick={() => void send()}
            >
              {sending ? "André réfléchit…" : "Envoyer"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Entrée pour envoyer · Maj+Entrée pour une ligne · André ajuste la difficulté après chaque réponse
          </p>
        </div>
      </div>
    </div>
  );
}
