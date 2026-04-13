import type { MessageParam, TextBlock } from "@anthropic-ai/sdk/resources/messages";
import type { ChatSessionKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildProgrammeGuidedSystemPrompt } from "@/lib/andre-prompt-guided";
import { buildAndreSystemPrompt } from "@/lib/andre-prompt";
import { andreModel, getAnthropic } from "@/lib/anthropic";
import { formatLoadedFolderForPrompt, loadProgrammeFolderForNiveau } from "@/lib/programme-folder-loader";
import { niveauLabel } from "@/lib/labels";
import { formatDictationsForGuidedPrompt } from "@/lib/dictation-prompt";
import { prisma } from "@/lib/prisma";
import { MINUTES_PER_CHAT_ROUND, recordStudentActivity } from "@/lib/record-student-activity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_USER_CHARS = 12_000;
const MAX_HISTORY_MESSAGES = 32;

/** Déclencheur interne : l’élève n’a rien écrit ; André ouvre la séance. */
const PROGRAMME_GUIDED_BOOTSTRAP_USER = `[Ouverture de séance « Programme guidé ». L’élève vient d’entrer dans l’interface immersive : il n’a pas encore écrit. Accueille-le brièvement (ton cool et rassurant), expose en 2–4 phrases le plan de travail que tu vas mener (en t’appuyant sur le programme et son profil), puis propose immédiatement le premier exercice concret avec une seule consigne claire — sans lui demander de choisir un thème ni un chapitre.]`;

function extractAssistantText(message: { content: unknown[] }): string {
  const blocks = message.content.filter((b): b is TextBlock => (b as TextBlock).type === "text");
  return blocks.map((b) => b.text).join("\n").trim();
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const client = getAnthropic();
  if (!client) {
    return NextResponse.json(
      { error: "Clé API Anthropic non configurée (ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  let body: {
    sessionId?: string | null;
    message?: string;
    mode?: string;
    bootstrap?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const mode: ChatSessionKind = body.mode === "programme_guided" ? "PROGRAMME_GUIDED" : "FREE";
  const isGuided = mode === "PROGRAMME_GUIDED";
  const isBootstrap = isGuided && body.bootstrap === true && !body.sessionId;

  const raw = typeof body.message === "string" ? body.message.trim() : "";
  if (!isBootstrap && !raw) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }
  if (raw.length > MAX_USER_CHARS) {
    return NextResponse.json({ error: "Message trop long." }, { status: 400 });
  }

  const userRow = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      studentProfile: {
        include: {
          programme: {
            include: {
              chapters: {
                orderBy: { order: "asc" },
                select: { id: true, order: true, title: true, objectives: true },
              },
            },
          },
        },
      },
    },
  });

  if (!userRow?.studentProfile) {
    return NextResponse.json({ error: "Profil élève introuvable." }, { status: 400 });
  }

  const sp = userRow.studentProfile;

  let programmeForPrompt = sp.programme;
  if (!programmeForPrompt) {
    programmeForPrompt = await prisma.programme.findUnique({
      where: { niveau: sp.niveau },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          select: { id: true, order: true, title: true, objectives: true },
        },
      },
    });
  }

  const chapterThemes =
    programmeForPrompt?.chapters
      .map((c) => {
        const obj = c.objectives.length
          ? ` — objectifs : ${c.objectives.slice(0, 3).join(" ; ")}`
          : "";
        return `${c.order}. **${c.title}**${obj}`;
      })
      .join("\n") ?? "";

  const firstName = userRow.name?.split(/\s+/)[0] ?? "toi";

  let chatSessionId = body.sessionId?.trim() || null;

  if (chatSessionId) {
    const existing = await prisma.chatSession.findFirst({
      where: { id: chatSessionId, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Session invalide." }, { status: 400 });
    }
    if (existing.kind !== mode) {
      return NextResponse.json({ error: "Session incompatible avec ce mode." }, { status: 400 });
    }
  } else {
    const created = await prisma.chatSession.create({
      data: {
        userId: session.user.id,
        niveau: sp.niveau,
        subject: isGuided ? "Séance programme guidée" : raw.slice(0, 120),
        kind: mode,
      },
    });
    chatSessionId = created.id;
  }

  if (!isBootstrap) {
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSessionId!,
        role: "USER",
        content: raw,
      },
    });
  }

  const historyRows = await prisma.chatMessage.findMany({
    where: { sessionId: chatSessionId! },
    orderBy: { createdAt: "asc" },
    take: MAX_HISTORY_MESSAGES,
  });

  const anthropicMessages: MessageParam[] = [];
  for (const row of historyRows) {
    if (row.role === "USER") {
      anthropicMessages.push({ role: "user", content: row.content });
    } else if (row.role === "ANDRE") {
      anthropicMessages.push({ role: "assistant", content: row.content });
    }
  }

  if (isBootstrap) {
    anthropicMessages.push({ role: "user", content: PROGRAMME_GUIDED_BOOTSTRAP_USER });
  }

  const folderLoad = loadProgrammeFolderForNiveau(sp.niveau, process.cwd());
  const aiBriefEffective = folderLoad
    ? formatLoadedFolderForPrompt(folderLoad)
    : programmeForPrompt?.aiBrief ?? null;

  const programmeTitle = programmeForPrompt?.title ?? `Français — ${niveauLabel[sp.niveau]}`;
  const showProgramme = Boolean(folderLoad || programmeForPrompt);

  const programmeCtx = showProgramme
    ? {
        title: programmeTitle,
        aiBrief: aiBriefEffective,
        chapterThemes,
        fromFolder: Boolean(folderLoad),
      }
    : null;

  let chapterProgressSummary = "";
  if (isGuided && programmeForPrompt?.chapters?.length) {
    const progressRows = await prisma.studentChapterProgress.findMany({
      where: {
        studentProfileId: sp.id,
        chapterId: { in: programmeForPrompt.chapters.map((c) => c.id) },
      },
    });
    const pmap = new Map(progressRows.map((r) => [r.chapterId, r.status]));
    chapterProgressSummary = programmeForPrompt.chapters
      .map((c) => {
        const st = pmap.get(c.id) ?? "NOT_STARTED";
        return `- Chapitre ${c.order} — ${c.title} — **${st}**`;
      })
      .join("\n");
  }

  const recentWhere =
    isGuided
      ? {
          role: "ANDRE" as const,
          session: { userId: session.user.id, kind: "FREE" as const },
          NOT: { sessionId: chatSessionId! },
        }
      : {
          role: "ANDRE" as const,
          session: { userId: session.user.id },
          NOT: { sessionId: chatSessionId! },
        };

  const recentAndreRows = await prisma.chatMessage.findMany({
    where: recentWhere,
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { content: true },
  });

  const recentDigest =
    recentAndreRows.length > 0
      ? recentAndreRows
          .reverse()
          .map((r, i) => `---\n### Échange antérieur ${i + 1}\n${r.content.slice(0, 2200)}`)
          .join("\n\n")
      : null;

  let dictationsSummary: string | null = null;
  if (isGuided && programmeForPrompt?.id) {
    const dictRows = await prisma.programmeDictation.findMany({
      where: { programmeId: programmeForPrompt.id },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    });
    const formatted = formatDictationsForGuidedPrompt(dictRows);
    dictationsSummary = formatted.trim().length > 0 ? formatted : null;
  }

  const system = isGuided
    ? buildProgrammeGuidedSystemPrompt({
        studentFirstName: firstName,
        niveau: sp.niveau,
        niveauLabel: niveauLabel[sp.niveau],
        interests: sp.interests,
        tags: sp.tags,
        programme: programmeCtx,
        chapterProgressSummary,
        recentFreeChatDigest: recentDigest,
        dictationsSummary,
      })
    : buildAndreSystemPrompt({
        studentFirstName: firstName,
        niveau: sp.niveau,
        niveauLabel: niveauLabel[sp.niveau],
        interests: sp.interests,
        tags: sp.tags,
        programme: programmeCtx,
        recentAndreDigest: recentDigest,
      });

  const encoder = new TextEncoder();
  const sse = (obj: object) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      const push = (obj: object) => controller.enqueue(sse(obj));
      let errorSentToClient = false;
      const pushErrorOnce = (message: string) => {
        if (errorSentToClient) return;
        errorSentToClient = true;
        push({ type: "error", message });
      };

      try {
        push({ type: "session", id: chatSessionId });

        const msgStream = client.messages.stream({
          model: andreModel(),
          max_tokens: 4096,
          system,
          messages: anthropicMessages,
          thinking: { type: "disabled" },
        });

        msgStream.on("text", (delta) => {
          push({ type: "delta", text: delta });
        });

        msgStream.on("error", (err) => {
          console.error("[chat] stream error", err);
          const msg =
            err instanceof Error
              ? err.message
              : typeof err === "object" && err !== null && "message" in err
                ? String((err as { message: unknown }).message)
                : "Erreur pendant la génération (API Anthropic).";
          pushErrorOnce(msg);
        });

        const final = await msgStream.finalMessage();
        const assistantText = extractAssistantText(final);
        if (!assistantText) {
          throw new Error(
            "Réponse du modèle sans texte utilisable. Vérifie ANTHROPIC_MODEL sur Vercel (ex. claude-sonnet-4-6) ou les logs.",
          );
        }

        await prisma.chatMessage.create({
          data: {
            sessionId: chatSessionId!,
            role: "ANDRE",
            content: assistantText,
            tokensUsed: final.usage?.output_tokens ?? null,
          },
        });

        await prisma.chatSession.update({
          where: { id: chatSessionId! },
          data: { updatedAt: new Date() },
        });

        await recordStudentActivity(session.user.id, MINUTES_PER_CHAT_ROUND);

        push({
          type: "done",
          usage: {
            input: final.usage?.input_tokens ?? null,
            output: final.usage?.output_tokens ?? null,
          },
        });
      } catch (e) {
        console.error("[chat]", e);
        if (!errorSentToClient) {
          pushErrorOnce(
            e instanceof Error ? e.message : "Erreur lors de la réponse d’André.",
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
