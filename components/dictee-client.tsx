"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/chat-markdown";
import type { DictationRow } from "@/components/programme-dictations";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconTooltipAction } from "@/components/icon-tooltip-action";
import { cn } from "@/lib/utils";

function dictationUrlLooksLikeVideo(url: string): boolean {
  const path = url.split("?")[0].split("#")[0].toLowerCase();
  return [".mp4", ".m4v", ".webm", ".mov"].some((ext) => path.endsWith(ext));
}

function storageKey(dictationId: string) {
  return `studelio.dicteeSession.${dictationId}`;
}

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

function DicteeList({ dictations }: { dictations: DictationRow[] }) {
  const sorted = useMemo(
    () => [...dictations].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
    [dictations],
  );

  return (
    <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
      <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">Choisir une dictée</h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--studelio-text-body)]">
        Tu écoutes l’audio, tu écris, puis tu envoies ton texte à André. Il a le corrigé en interne : il t’aide sans te
        le donner mot pour mot, et peut te proposer une note sur 20.
      </p>
      <ul className="mt-6 space-y-3">
        {sorted.map((d) => (
          <li key={d.id}>
            <Link
              href={`/app/dictee?d=${encodeURIComponent(d.id)}`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto w-full justify-start rounded-xl px-4 py-3 text-left font-medium text-[var(--studelio-text)]",
              )}
            >
              {d.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DicteeMedia({ row }: { row: DictationRow }) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [rate, setRate] = useState(1);
  const isVideo = useMemo(() => dictationUrlLooksLikeVideo(row.audioUrl), [row.audioUrl]);

  useEffect(() => {
    const el = mediaRef.current;
    if (el) el.playbackRate = rate;
  }, [rate]);

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)]/40 p-4">
      <h3 className="font-medium text-[var(--studelio-text)]">{row.title}</h3>
      {isVideo ? (
        <video
          ref={(el) => {
            mediaRef.current = el;
          }}
          className="w-full max-w-md rounded-lg bg-black/5"
          controls
          src={row.audioUrl}
          preload="metadata"
        />
      ) : (
        <audio
          ref={(el) => {
            mediaRef.current = el;
          }}
          className="w-full max-w-md"
          controls
          src={row.audioUrl}
          preload="metadata"
        />
      )}
      <label className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="whitespace-nowrap">Vitesse</span>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.1}
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value))}
          className="w-36 accent-[var(--studelio-blue)]"
        />
        <span className="w-10 font-mono text-[var(--studelio-text)]">{rate.toFixed(1)}×</span>
      </label>
    </div>
  );
}

function DicteeSessionPane({ dictation }: { dictation: DictationRow }) {
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
  const key = storageKey(dictation.id);

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
        sessionStorage.removeItem(key);
        setError("Session introuvable — on repart à zéro.");
        setSessionId(null);
        return 0;
      }
      const data = (await res.json()) as { messages?: ChatMessageRow[] };
      const list = data.messages ?? [];
      setMessages(list);
      return list.length;
    } catch {
      setError("Impossible de charger les messages.");
      return 0;
    } finally {
      setLoadingMessages(false);
    }
  }, [key]);

  const runBootstrap = useCallback(async () => {
    setError(null);
    setStreamText("");
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "dictee", dictationId: dictation.id, bootstrap: true }),
      });

      if (res.status === 503) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "André n’est pas disponible.");
        return;
      }

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
          sessionStorage.setItem(key, id);
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
  }, [dictation.id, key, loadMessages]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        setSessionId(stored);
        const n = await loadMessages(stored);
        if (n === 0) {
          sessionStorage.removeItem(key);
          setSessionId(null);
          await runBootstrap();
        } else {
          setBootstrapping(false);
        }
      } else {
        await runBootstrap();
      }
    })();
  }, [key, loadMessages, runBootstrap]);

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
        body: JSON.stringify({ mode: "dictee", sessionId, message: text }),
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

  function restart() {
    sessionStorage.removeItem(key);
    setSessionId(null);
    setMessages([]);
    setError(null);
    setStreamText("");
    setBootstrapping(true);
    void runBootstrap();
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 space-y-4 lg:max-w-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/dictee"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex rounded-full gap-1.5 text-[var(--studelio-text-body)]",
            )}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Toutes les dictées
          </Link>
          <IconTooltipAction label="Nouvelle session (même dictée)">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Nouvelle session"
              onClick={() => restart()}
            >
              <Sparkles className="size-4" />
            </Button>
          </IconTooltipAction>
        </div>
        <DicteeMedia row={dictation} />
        <p className="text-xs text-muted-foreground">
          Écoute autant de fois que nécessaire, puis colle ou tape ta dictée dans le chat. Tu ne verras pas le texte
          officiel ici — André le compare en coulisse.
        </p>
      </aside>

      <div className="flex min-h-[min(70vh,32rem)] flex-1 flex-col rounded-[20px] border border-[var(--studelio-border)] bg-card shadow-[var(--studelio-shadow)]">
        <header className="border-b border-[var(--studelio-border)] px-4 py-3 sm:px-6">
          <h2 className="font-display text-lg font-semibold text-[var(--studelio-text)]">André — dictée</h2>
          <p className="text-xs text-muted-foreground">
            Indices et relecture guidée, pas le corrigé à recopier. Une petite note /20 est possible.
          </p>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            {bootstrapping || loadingMessages ? (
              <p className="text-sm text-muted-foreground">Connexion à André…</p>
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
                      : "border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)] text-[var(--studelio-text-body)]",
                  )}
                >
                  {m.role === "ANDRE" ? (
                    <ChatMarkdown content={m.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}

            {sending && !streamText ? (
              <div className="flex justify-start">
                <div className="flex max-w-[min(100%,40rem)] items-center gap-2 rounded-2xl border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)] px-4 py-2.5 text-sm text-muted-foreground">
                  <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--studelio-blue)]" />
                  André réfléchit…
                </div>
              </div>
            ) : null}

            {streamText ? (
              <div className="flex justify-start">
                <div className="max-w-[min(100%,40rem)] rounded-2xl border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--studelio-text-body)]">
                  <ChatMarkdown content={streamText} />
                  <span className="mt-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--studelio-blue)]" />
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          {error ? (
            <div className="border-t border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive sm:px-6">
              {error}
            </div>
          ) : null}

          <div className="border-t border-[var(--studelio-border)] p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Colle ou tape ta dictée ici…"
                rows={4}
                disabled={sending || bootstrapping || !sessionId}
                className={cn(
                  "min-h-[6rem] w-full flex-1 resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors",
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
            <p className="mt-2 text-xs text-muted-foreground">Entrée pour envoyer · Maj+Entrée pour une ligne</p>
          </div>
        </div>
      </div>
    </div>
  );
}

type ClientProps = {
  dictations: DictationRow[];
  initialDictationId: string | null;
};

export function DicteeClient({ dictations, initialDictationId }: ClientProps) {
  const row =
    initialDictationId && dictations.some((x) => x.id === initialDictationId)
      ? dictations.find((x) => x.id === initialDictationId)!
      : null;

  if (initialDictationId && !row) {
    return (
      <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-8 shadow-[var(--studelio-shadow)]">
        <p className="text-[var(--studelio-text-body)]">Cette dictée n’existe pas ou n’est pas disponible pour ton niveau.</p>
        <Link href="/app/dictee" className={cn(buttonVariants(), "mt-4 inline-flex rounded-full")}>
          Voir la liste des dictées
        </Link>
      </div>
    );
  }

  if (!row) {
    return <DicteeList dictations={dictations} />;
  }

  return <DicteeSessionPane key={row.id} dictation={row} />;
}
