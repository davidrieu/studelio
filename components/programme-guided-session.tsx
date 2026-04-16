"use client";

import { AlertCircle, BookMarked, Info, MessageCircle, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/chat-markdown";
import type { CompetencyScores } from "@/lib/programme-guided-meta";
import { previewWithoutMetaTail } from "@/lib/programme-guided-meta";
import {
  PROGRAMME_GUIDED_UI_PRESET_CLASS_FOCUS,
  PROGRAMME_GUIDED_UI_PRESET_EXERCISE,
} from "@/lib/programme-guided-ui-presets";
import { emitProgrammeProgressUpdated } from "@/lib/studelio-programme-progress-events";
import type { StudelioProgressDeltaPayload } from "@/lib/studelio-progress-delta";
import { isStudelioProgressDeltaPayload } from "@/lib/studelio-progress-delta";
import { IconTooltipAction } from "@/components/icon-tooltip-action";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProgrammeSeanceContextBanner = {
  programmeTitle: string;
  niveauLabel: string;
  sourceDetail: string;
};

const STORAGE_KEY = "studelio.programmeGuidedSessionId";

const RADAR_SHORT: Record<keyof CompetencyScores, string> = {
  grammaire: "Gram.",
  orthographe: "Orth.",
  conjugaison: "Conj.",
  vocabulaire: "Vocab.",
  expressionEcrite: "Écrit.",
  lecture: "Lect.",
};

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
): Promise<{
  assistant: string;
  receivedDone: boolean;
  streamError: string | null;
  studelioProgressHint: string | null;
  studelioProgressDelta: StudelioProgressDeltaPayload | null;
}> {
  if (!res.body) throw new Error("empty body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistant = "";
  let receivedDone = false;
  let streamError: string | null = null;
  let studelioProgressHint: string | null = null;
  let studelioProgressDelta: StudelioProgressDeltaPayload | null = null;

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
      const h = payload.studelioProgressHint;
      if (typeof h === "string" && h.trim()) studelioProgressHint = h.trim();
      const d = payload.studelioProgressDelta;
      if (isStudelioProgressDeltaPayload(d)) studelioProgressDelta = d;
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

  return { assistant, receivedDone, streamError, studelioProgressHint, studelioProgressDelta };
}

type SessionProps = {
  contextBanner: ProgrammeSeanceContextBanner;
};

function formatDeltaNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, "");
}

function formatDeltaChips(d: StudelioProgressDeltaPayload): string {
  const parts: string[] = [];
  (Object.keys(RADAR_SHORT) as (keyof CompetencyScores)[]).forEach((k) => {
    const v = d.radarDelta[k];
    if (v && v > 0) parts.push(`+${formatDeltaNumber(v)} ${RADAR_SHORT[k]}`);
  });
  for (const m of d.moduleDeltas) {
    if (!m.units || m.units <= 0) continue;
    parts.push(
      m.order === 0 ? `+${formatDeltaNumber(m.units)} barre` : `+${formatDeltaNumber(m.units)} M${m.order}`,
    );
  }
  const s = parts.join(" · ");
  return s.length > 52 ? `${s.slice(0, 49)}…` : s;
}

function deltaKindLabel(kind: StudelioProgressDeltaPayload["kind"]): string {
  if (kind === "prose") return "Texte";
  return "META";
}

/** Encart Parcours : vert = OK, ambre = avertissement, rouge = échec enregistrement. */
function parcoursHintTone(h: string): "success" | "error" | "warning" {
  const t = h.toLowerCase();
  if (
    t.includes("pas pu") ||
    t.includes("erreur serveur") ||
    t.includes("impossible de") ||
    (t.includes("introuvable") && t.includes("parcours")) ||
    (t.includes("manque") && (t.includes("base") || t.includes("table"))) ||
    t.includes("migrations prisma") ||
    t.includes("migrate deploy")
  ) {
    return "error";
  }
  if (
    t.includes("ne peut pas") ||
    t.includes("non relié") ||
    t.includes("n'est pas relié") ||
    t.includes("n’est pas relié") ||
    t.includes("aucun programme")
  ) {
    return "warning";
  }
  return "success";
}

export function ProgrammeGuidedSession({ contextBanner }: SessionProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [input, setInput] = useState("");
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progressHint, setProgressHint] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  /** Points Parcours affichés à côté du message André correspondant (id message serveur). */
  const [deltasByMessageId, setDeltasByMessageId] = useState<Record<string, StudelioProgressDeltaPayload>>({});
  /** Somme des `displayPoints` pour cette séance (mémoire locale, décimales conservées). */
  const [sessionParcoursPoints, setSessionParcoursPoints] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const userHasReplied = useMemo(() => messages.some((m) => m.role === "USER"), [messages]);

  /** Raccourcis : une seule fois par séance, avant la première réponse de l’élève (bouton ou texte). */
  const showProgrammeChoices = useMemo(() => {
    if (!sessionId || bootstrapping || loadingMessages || sending || streamText) return false;
    if (userHasReplied) return false;
    const last = messages[messages.length - 1];
    return last?.role === "ANDRE";
  }, [sessionId, bootstrapping, loadingMessages, sending, streamText, messages, userHasReplied]);

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadMessages = useCallback(async (sid: string): Promise<{ count: number; lastAndreId: string | null }> => {
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
        return { count: 0, lastAndreId: null };
      }
      const data = (await res.json()) as { messages?: ChatMessageRow[] };
      const list = data.messages ?? [];
      setMessages(list);
      let lastAndreId: string | null = null;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].role === "ANDRE") {
          lastAndreId = list[i].id;
          break;
        }
      }
      return { count: list.length, lastAndreId };
    } catch {
      setError("Impossible de charger la séance.");
      return { count: 0, lastAndreId: null };
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const runBootstrap = useCallback(async () => {
    setError(null);
    setStreamText("");
    setSending(true);
    setProgressHint(null);
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
      const { assistant, receivedDone, streamError, studelioProgressHint, studelioProgressDelta } =
        await consumeChatStream(res, {
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

      if (studelioProgressHint) setProgressHint(studelioProgressHint);

      if (newId) {
        const { lastAndreId } = await loadMessages(newId);
        if (lastAndreId && studelioProgressDelta && studelioProgressDelta.displayPoints > 0) {
          setDeltasByMessageId((prev) => ({ ...prev, [lastAndreId]: studelioProgressDelta }));
          setSessionParcoursPoints(
            (p) => Math.round((p + studelioProgressDelta.displayPoints) * 100) / 100,
          );
        }
      }
      if (!streamError && (receivedDone || assistant.trim().length > 0)) {
        emitProgrammeProgressUpdated();
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
        const { count: n } = await loadMessages(stored);
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

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || !sessionId) return;
    setInput("");
    setError(null);
    setProgressHint(null);
    setSending(true);
    setStreamText("");

    const userMsg: ChatMessageRow = {
      id: `local-${Date.now()}`,
      role: "USER",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "programme_guided", sessionId, message: trimmed }),
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

      const { assistant, receivedDone, streamError, studelioProgressHint, studelioProgressDelta } =
        await consumeChatStream(res, {
          onSession: () => {},
          onDelta: (a) => setStreamText(a),
          onError: (m) => setError(m),
          onDone: () => {},
        });

      if (!receivedDone && !streamError && !assistant) {
        setError("Réponse incomplète — réessaie.");
      }

      if (studelioProgressHint) setProgressHint(studelioProgressHint);

      const { lastAndreId } = await loadMessages(sessionId);
      if (lastAndreId && studelioProgressDelta && studelioProgressDelta.displayPoints > 0) {
        setDeltasByMessageId((prev) => ({ ...prev, [lastAndreId]: studelioProgressDelta }));
        setSessionParcoursPoints(
          (p) => Math.round((p + studelioProgressDelta.displayPoints) * 100) / 100,
        );
      }
      if (!streamError && (receivedDone || assistant.trim().length > 0)) {
        emitProgrammeProgressUpdated();
        router.refresh();
      }
    } catch {
      setError("Erreur réseau.");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setSending(false);
      setStreamText("");
    }
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    await sendMessage(text);
  }

  function newSession() {
    sessionStorage.removeItem(STORAGE_KEY);
    setSessionId(null);
    setMessages([]);
    setError(null);
    setStreamText("");
    setDeltasByMessageId({});
    setSessionParcoursPoints(0);
    setProgressHint(null);
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
              André mène la séance ; en dessous de chaque message d’André tu peux choisir un raccourci ou écrire librement.
            </p>
            {sessionParcoursPoints > 0 ? (
              <p
                className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-900 dark:text-emerald-100"
                aria-live="polite"
              >
                <Sparkles className="size-3.5 shrink-0 opacity-90" aria-hidden />
                <span className="min-w-0 truncate">
                  Cette séance · +{formatDeltaNumber(sessionParcoursPoints)} pts Parcours (cumul)
                </span>
              </p>
            ) : null}
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
            <IconTooltipAction label="Mon parcours (radar & modules)">
              <Link
                href="/app/programme"
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon" }),
                  "inline-flex rounded-full text-[var(--studelio-text-body)]",
                )}
                aria-label="Mon parcours — radar et modules"
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

          {messages.map((m) => {
            const delta = m.role === "ANDRE" ? deltasByMessageId[m.id] : undefined;
            return (
              <div
                key={m.id}
                className={cn("flex w-full", m.role === "USER" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "flex min-w-0 max-w-full items-start gap-2",
                    m.role === "USER" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <div
                    className={cn(
                      "min-w-0 max-w-[min(100%,40rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed",
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
                  {m.role === "ANDRE" && delta ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 24 }}
                      className="w-[5.25rem] shrink-0 rounded-2xl border border-emerald-500/35 bg-gradient-to-b from-emerald-500/15 to-emerald-600/5 px-2 py-2 text-center shadow-sm dark:from-emerald-950/50 dark:to-emerald-950/20"
                      aria-label={`Parcours : plus ${formatDeltaNumber(delta.displayPoints)} points`}
                    >
                      <span className="font-display text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                        +{formatDeltaNumber(delta.displayPoints)}
                      </span>
                      <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-wide text-emerald-800/90 dark:text-emerald-200/90">
                        Parcours
                      </span>
                      <span className="mt-1 block text-[10px] leading-tight text-muted-foreground">
                        {formatDeltaChips(delta)}
                      </span>
                      <span className="mt-1 block text-[9px] text-muted-foreground/80">{deltaKindLabel(delta.kind)}</span>
                    </motion.div>
                  ) : null}
                </div>
              </div>
            );
          })}

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

        {progressHint ? (
          (() => {
            const tone = parcoursHintTone(progressHint);
            return (
              <div
                className={cn(
                  "flex items-start gap-3 border-t px-4 py-3 sm:px-8",
                  tone === "success" &&
                    "border-emerald-500/40 bg-emerald-500/15 dark:bg-emerald-950/45 [&_p]:text-emerald-950 dark:[&_p]:text-emerald-50",
                  tone === "warning" &&
                    "border-amber-500/40 bg-amber-500/12 dark:bg-amber-950/35 [&_p]:text-amber-950 dark:[&_p]:text-amber-50",
                  tone === "error" &&
                    "border-destructive/35 bg-destructive/10 dark:bg-destructive/15 [&_p]:text-destructive dark:[&_p]:text-red-100",
                )}
                role={tone === "error" ? "alert" : "status"}
              >
                {tone === "error" ? (
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                ) : (
                  <TrendingUp
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      tone === "warning" ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300",
                    )}
                    aria-hidden
                  />
                )}
                <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{progressHint}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 px-2 text-xs"
                  onClick={() => setProgressHint(null)}
                >
                  Fermer
                </Button>
              </div>
            );
          })()
        ) : null}

        {showProgrammeChoices ? (
          <div
            className="border-t border-[var(--studelio-border)] bg-[var(--studelio-blue-dim)]/25 px-4 py-3 sm:px-8"
            role="group"
            aria-label="Raccourcis de réponse"
          >
            <p className="mb-2 text-xs font-medium text-[var(--studelio-text)]">Que veux-tu faire ?</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="default"
                className="h-auto min-h-10 w-full justify-center rounded-xl px-4 py-2.5 text-left text-sm font-medium sm:w-auto sm:min-w-[12rem]"
                disabled={sending || bootstrapping || !sessionId}
                onClick={() => void sendMessage(PROGRAMME_GUIDED_UI_PRESET_EXERCISE)}
              >
                Faire l’exercice proposé
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-10 w-full justify-center rounded-xl border-[var(--studelio-blue)]/40 bg-card px-4 py-2.5 text-left text-sm font-medium text-[var(--studelio-text)] sm:w-auto sm:min-w-[12rem]"
                disabled={sending || bootstrapping || !sessionId}
                onClick={() => void sendMessage(PROGRAMME_GUIDED_UI_PRESET_CLASS_FOCUS)}
              >
                Parler de ce qu’on fait en cours
              </Button>
            </div>
          </div>
        ) : null}

        <div className="border-t border-[var(--studelio-border)] bg-card/80 px-4 py-4 backdrop-blur sm:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                userHasReplied
                  ? "Réponds à André…"
                  : "Réponds librement à André, ou utilise les deux boutons au-dessus…"
              }
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
            Entrée pour envoyer · Maj+Entrée pour une ligne · Après chaque réponse d’André : encart vert sous le fil +
            pastille à droite du message avec les points Parcours enregistrés pour ce tour.
          </p>
        </div>
      </div>
    </div>
  );
}
