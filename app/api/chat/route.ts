import type { MessageParam, TextBlock } from "@anthropic-ai/sdk/resources/messages";
import type { ChatSessionKind } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildDicteeSystemPrompt } from "@/lib/andre-prompt-dictee";
import { buildProgrammeGuidedSystemPrompt } from "@/lib/andre-prompt-guided";
import { buildAndreSystemPrompt } from "@/lib/andre-prompt";
import { andreModel, getAnthropic } from "@/lib/anthropic";
import { formatLoadedFolderForPrompt, loadProgrammeFolderForNiveau } from "@/lib/programme-folder-loader";
import { niveauLabel } from "@/lib/labels";
import { ensureProgrammeStandardModules } from "@/lib/ensure-programme-standard-modules";
import {
  persistProgrammeGuidedProgressTurn,
  revalidateProgrammeProgressViews,
} from "@/lib/persist-programme-guided-progress";
import { findStudentChapterProgressRowsSafe } from "@/lib/load-student-chapter-progress-safe";
import { prisma } from "@/lib/prisma";
import { stripProgrammeGuidedMeta } from "@/lib/programme-guided-meta";
import type { StudelioProgressDeltaPayload } from "@/lib/studelio-progress-delta";
import { ensureStudentProgrammeLinkedToCanonical } from "@/lib/student-programme-canonical";
import { MINUTES_PER_CHAT_ROUND, recordStudentActivity } from "@/lib/record-student-activity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_USER_CHARS = 12_000;
/** Nombre max de messages (user + André) envoyés au modèle — les plus récents uniquement. */
const MAX_HISTORY_MESSAGES = 36;

/** Déclencheur interne : l’élève n’a rien écrit ; André ouvre la séance. */
const PROGRAMME_GUIDED_BOOTSTRAP_USER = `[Ouverture de séance « Programme guidé ». L’élève vient d’entrer dans l’interface immersive : il n’a pas encore écrit. Accueille-le brièvement (ton cool et rassurant), expose en 2–4 phrases le plan de travail que tu vas mener (en t’appuyant sur le programme et son profil), pose une question courte sur ce qu’il travaille en ce moment en cours de français (priorité du moment), puis propose immédiatement le premier exercice concret avec une seule consigne claire — en collant dans ce message tout extrait de texte nécessaire (blockquote ou bloc texte) pour qu’il n’ait pas à scroller plus tard.]`;

const DICTEE_BOOTSTRAP_USER = `[Ouverture dictée Studelio. L’élève a l’audio sur la page (lecteur, vitesse réglable). Il n’a pas encore envoyé son texte. Accueille-le brièvement, rappelle la consigne : il doit **écrire sa dictée directement dans le grand champ de texte sous la conversation** (zone prévue dans l’app), pas sur papier ni dans un autre document. Quand il a fini, il envoie avec le bouton. **Ne lui propose pas** d’envoyer une photo, une image ou un fichier : ce n’est pas possible dans l’app pour l’instant. Ne donne pas le texte officiel. Sois rassurant.]`;

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
    dictationId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const mode: ChatSessionKind =
    body.mode === "programme_guided" ? "PROGRAMME_GUIDED" : body.mode === "dictee" ? "DICTATION" : "FREE";
  const isGuided = mode === "PROGRAMME_GUIDED";
  const isDictee = mode === "DICTATION";
  const isBootstrap = isGuided && body.bootstrap === true && !body.sessionId;
  const isDicteeBootstrap = isDictee && body.bootstrap === true && !body.sessionId;

  const raw = typeof body.message === "string" ? body.message.trim() : "";
  if (!isBootstrap && !isDicteeBootstrap && !raw) {
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

  if (programmeForPrompt?.id) {
    await ensureProgrammeStandardModules(programmeForPrompt.id);
    const refreshed = await prisma.programme.findUnique({
      where: { id: programmeForPrompt.id },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          select: { id: true, order: true, title: true, objectives: true },
        },
      },
    });
    if (refreshed) programmeForPrompt = refreshed;
  }

  /** Même programme que la page Parcours (barres / radar) — lie le profil si besoin, resynchronise le contexte prompt. */
  let canonicalProgrammeIdForGuided: string | null = null;
  if (isGuided) {
    canonicalProgrammeIdForGuided = await ensureStudentProgrammeLinkedToCanonical({
      studentProfileId: sp.id,
      niveau: sp.niveau,
      programmeIdOnProfile: sp.programmeId,
      programmeRelationId: sp.programme?.id ?? null,
    });
    if (canonicalProgrammeIdForGuided && programmeForPrompt?.id !== canonicalProgrammeIdForGuided) {
      const synced = await prisma.programme.findUnique({
        where: { id: canonicalProgrammeIdForGuided },
        include: {
          chapters: {
            orderBy: { order: "asc" },
            select: { id: true, order: true, title: true, objectives: true },
          },
        },
      });
      if (synced) {
        await ensureProgrammeStandardModules(synced.id);
        programmeForPrompt =
          (await prisma.programme.findUnique({
            where: { id: synced.id },
            include: {
              chapters: {
                orderBy: { order: "asc" },
                select: { id: true, order: true, title: true, objectives: true },
              },
            },
          })) ?? synced;
      }
    }
  }

  /** Persistance radar / barres : id canonique, ou à défaut le programme déjà chargé pour le prompt (évite zéro écriture si la résolution canonique a échoué). */
  const guidedPersistProgrammeId =
    isGuided ? (canonicalProgrammeIdForGuided ?? programmeForPrompt?.id ?? null) : null;

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
  let dicteeContext: { title: string; correctedText: string } | null = null;

  async function loadDictationForStudent(dictationId: string) {
    const pid =
      sp.programmeId ??
      (await prisma.programme.findUnique({ where: { niveau: sp.niveau }, select: { id: true } }))?.id;
    if (!pid) {
      return null;
    }
    return prisma.programmeDictation.findFirst({
      where: { id: dictationId, programmeId: pid },
      select: { id: true, title: true, correctedText: true },
    });
  }

  if (isDictee) {
    const dictationIdFromBody = typeof body.dictationId === "string" ? body.dictationId.trim() : "";
    if (chatSessionId) {
      const existing = await prisma.chatSession.findFirst({
        where: { id: chatSessionId, userId: session.user.id, kind: "DICTATION" },
        include: { dictation: { select: { title: true, correctedText: true } } },
      });
      if (!existing) {
        return NextResponse.json({ error: "Session invalide." }, { status: 400 });
      }
      if (!existing.dictation) {
        return NextResponse.json({ error: "Dictée introuvable pour cette session." }, { status: 400 });
      }
      dicteeContext = {
        title: existing.dictation.title,
        correctedText: existing.dictation.correctedText,
      };
    } else {
      if (!dictationIdFromBody) {
        return NextResponse.json({ error: "dictationId requis pour une nouvelle dictée." }, { status: 400 });
      }
      const d = await loadDictationForStudent(dictationIdFromBody);
      if (!d) {
        return NextResponse.json({ error: "Dictée introuvable ou niveau incompatible." }, { status: 400 });
      }
      dicteeContext = { title: d.title, correctedText: d.correctedText };
      const created = await prisma.chatSession.create({
        data: {
          userId: session.user.id,
          niveau: sp.niveau,
          subject: `Dictée : ${d.title}`,
          kind: "DICTATION",
          dictationId: d.id,
        },
      });
      chatSessionId = created.id;
    }
  } else if (chatSessionId) {
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

  if (!isBootstrap && !isDicteeBootstrap) {
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSessionId!,
        role: "USER",
        content: raw,
      },
    });
  }

  const totalMessagesInSession = await prisma.chatMessage.count({
    where: { sessionId: chatSessionId! },
  });
  const historyRowsDesc = await prisma.chatMessage.findMany({
    where: { sessionId: chatSessionId! },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY_MESSAGES,
  });
  const historyRows = historyRowsDesc.slice().reverse();
  const historyTruncatedEarly = totalMessagesInSession > MAX_HISTORY_MESSAGES;

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
  if (isDicteeBootstrap) {
    anthropicMessages.push({ role: "user", content: DICTEE_BOOTSTRAP_USER });
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
  if (isGuided && programmeForPrompt?.chapters?.length && !isDictee) {
    const progressRows = await findStudentChapterProgressRowsSafe(
      sp.id,
      programmeForPrompt.chapters.map((c) => c.id),
    );
    const pmap = new Map(progressRows.map((r) => [r.chapterId, r.status]));
    chapterProgressSummary = programmeForPrompt.chapters
      .map((c) => {
        const st = pmap.get(c.id) ?? "NOT_STARTED";
        return `- Module ${c.order} — ${c.title} — **${st}**`;
      })
      .join("\n");
  }

  const recentWhere =
    isGuided || isDictee
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

  let recentProgrammeGuidedDigest: string | null = null;
  if (isGuided) {
    const guidedPastRows = await prisma.chatMessage.findMany({
      where: {
        role: "ANDRE",
        session: { userId: session.user.id, kind: "PROGRAMME_GUIDED" },
        NOT: { sessionId: chatSessionId! },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { content: true },
    });
    if (guidedPastRows.length > 0) {
      recentProgrammeGuidedDigest = guidedPastRows
        .reverse()
        .map(
          (r, i) =>
            `---\n### Séance programme guidée antérieure — extrait ${i + 1}\n${r.content.slice(0, 1400)}`,
        )
        .join("\n\n");
    }
  }

  if (isDictee && !dicteeContext) {
    return NextResponse.json({ error: "Contexte dictée manquant." }, { status: 500 });
  }

  const system = isDictee
    ? buildDicteeSystemPrompt({
        studentFirstName: firstName,
        niveau: sp.niveau,
        niveauLabel: niveauLabel[sp.niveau],
        interests: sp.interests,
        tags: sp.tags,
        dictationTitle: dicteeContext!.title,
        officialText: dicteeContext!.correctedText,
      })
    : isGuided
      ? buildProgrammeGuidedSystemPrompt({
          studentFirstName: firstName,
          niveau: sp.niveau,
          niveauLabel: niveauLabel[sp.niveau],
          interests: sp.interests,
          tags: sp.tags,
          programme: programmeCtx,
          chapterProgressSummary,
          recentFreeChatDigest: recentDigest,
          recentProgrammeGuidedDigest,
          historyTruncatedEarly,
          visibleMessageCount: historyRows.length,
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

        const strippedGuided = isGuided ? stripProgrammeGuidedMeta(assistantText) : null;
        // Séance programme : on conserve le texte complet (META inclus) pour rejouage / audit ; l’UI masque le META.
        const contentToStore = isGuided ? assistantText : (strippedGuided?.content ?? assistantText);

        await prisma.chatMessage.create({
          data: {
            sessionId: chatSessionId!,
            role: "ANDRE",
            content: contentToStore,
            tokensUsed: final.usage?.output_tokens ?? null,
          },
        });

        let studelioProgressHint: string | null = null;
        let studelioProgressDelta: StudelioProgressDeltaPayload | null = null;
        if (isGuided) {
          if (!guidedPersistProgrammeId) {
            studelioProgressHint =
              "Parcours : aucun programme n’est relié à ton niveau en base — la progression ne peut pas s’enregistrer. Vérifie avec un admin que le programme existe pour ta classe.";
          } else {
            try {
              const out = await persistProgrammeGuidedProgressTurn({
                studentProfileId: sp.id,
                programmeId: guidedPersistProgrammeId,
                assistantText,
              });
              studelioProgressHint = out.studelioProgressHint;
              studelioProgressDelta = out.studelioProgressDelta;
              try {
                revalidateProgrammeProgressViews();
              } catch (revErr) {
                console.error(
                  "[chat] revalidatePath Parcours ignorée (souvent indisponible depuis un Route Handler — le client recharge via l’API)",
                  revErr,
                );
              }
            } catch (e) {
              const code = e instanceof Prisma.PrismaClientKnownRequestError ? e.code : undefined;
              console.error("[chat] programme guided progress", e, code ? `[Prisma ${code}]` : "");
              studelioProgressHint =
                "Parcours : la mise à jour n’a pas pu s’enregistrer (erreur serveur). Réessaie dans un instant ou ouvre « Parcours » et clique « Recharger les scores ».";
            }
          }
        }

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
          ...(studelioProgressHint ? { studelioProgressHint } : {}),
          ...(studelioProgressDelta ? { studelioProgressDelta } : {}),
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
