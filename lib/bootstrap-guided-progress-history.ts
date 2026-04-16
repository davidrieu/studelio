import { prisma } from "@/lib/prisma";
import { stripProgrammeGuidedMeta, type ParsedProgrammeGuidedMeta } from "@/lib/programme-guided-meta";
import { applyProgrammeGuidedSessionMeta } from "@/lib/apply-programme-guided-session-meta";
import { MODULE_COMPLETION_META_HITS } from "@/lib/programme-module-progress";

const META_SNIPPET = "[[STUDELIO_META]]";
const REPLAY_CAP = 400;

function isGuidedMetaReplayed(errorProfile: unknown): boolean {
  if (!errorProfile || typeof errorProfile !== "object" || Array.isArray(errorProfile)) return false;
  const nest = (errorProfile as Record<string, unknown>).__studelio;
  if (!nest || typeof nest !== "object" || Array.isArray(nest)) return false;
  return Boolean((nest as Record<string, unknown>).guidedMetaReplayed);
}

function withGuidedMetaReplayedFlag(errorProfile: unknown): Record<string, unknown> {
  const base =
    errorProfile && typeof errorProfile === "object" && !Array.isArray(errorProfile)
      ? { ...(errorProfile as Record<string, unknown>) }
      : {};
  const prev =
    base.__studelio && typeof base.__studelio === "object" && !Array.isArray(base.__studelio)
      ? { ...(base.__studelio as Record<string, unknown>) }
      : {};
  base.__studelio = { ...prev, guidedMetaReplayed: true };
  return base;
}

/**
 * Une seule fois par élève :
 * - si des messages André contiennent encore le META → rejouage pour recoller radar + barres ;
 * - sinon → bonus unique basé sur le nombre de messages André en séance programme (historique sans META en base).
 */
export async function bootstrapGuidedProgressHistoryOnce(input: {
  studentProfileId: string;
  userId: string;
  programmeId: string;
}): Promise<void> {
  const { studentProfileId, userId, programmeId } = input;

  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: { errorProfile: true },
  });
  if (isGuidedMetaReplayed(profile?.errorProfile)) return;

  const withMeta = await prisma.chatMessage.findMany({
    where: {
      role: "ANDRE",
      content: { contains: META_SNIPPET },
      session: { userId, kind: "PROGRAMME_GUIDED" },
    },
    orderBy: { createdAt: "asc" },
    take: REPLAY_CAP,
    select: { content: true },
  });

  const replayMetas: ParsedProgrammeGuidedMeta[] = [];
  for (const m of withMeta) {
    const { meta } = stripProgrammeGuidedMeta(m.content);
    if (meta) replayMetas.push(meta);
  }

  let usedReplay = false;
  if (replayMetas.length > 0) {
    await prisma.studentCompetencyProgress.deleteMany({ where: { studentProfileId } });
    await prisma.studentChapterProgress.deleteMany({
      where: { studentProfileId, chapter: { programmeId } },
    });
    for (const meta of replayMetas) {
      await applyProgrammeGuidedSessionMeta({ studentProfileId, programmeId, meta });
    }
    usedReplay = true;
  }

  if (!usedReplay) {
    const andreCount = await prisma.chatMessage.count({
      where: { role: "ANDRE", session: { userId, kind: "PROGRAMME_GUIDED" } },
    });
    if (andreCount >= 2) {
      const perAxis = Math.min(85, 12 + Math.min(andreCount, 45) * 2);
      const existing = await prisma.studentCompetencyProgress.findUnique({
        where: { studentProfileId },
      });
      const merged = {
        grammaire: Math.max(existing?.grammaire ?? 0, perAxis),
        orthographe: Math.max(existing?.orthographe ?? 0, perAxis),
        conjugaison: Math.max(existing?.conjugaison ?? 0, perAxis),
        vocabulaire: Math.max(existing?.vocabulaire ?? 0, perAxis),
        expressionEcrite: Math.max(existing?.expressionEcrite ?? 0, perAxis),
        lecture: Math.max(existing?.lecture ?? 0, perAxis),
      };
      await prisma.studentCompetencyProgress.upsert({
        where: { studentProfileId },
        create: {
          studentProfileId,
          grammaire: merged.grammaire,
          orthographe: merged.orthographe,
          conjugaison: merged.conjugaison,
          vocabulaire: merged.vocabulaire,
          expressionEcrite: merged.expressionEcrite,
          lecture: merged.lecture,
        },
        update: merged,
      });

      const chapters = await prisma.programmeChapter.findMany({
        where: { programmeId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      const hits = Math.min(
        MODULE_COMPLETION_META_HITS - 1,
        Math.max(1, Math.floor(andreCount / 10)),
      );
      for (const ch of chapters) {
        const row = await prisma.studentChapterProgress.findUnique({
          where: {
            studentProfileId_chapterId: { studentProfileId, chapterId: ch.id },
          },
        });
        if (row?.status === "COMPLETED") continue;
        const nextHits = Math.max(row?.programmeMetaHits ?? 0, hits);
        await prisma.studentChapterProgress.upsert({
          where: {
            studentProfileId_chapterId: { studentProfileId, chapterId: ch.id },
          },
          create: {
            studentProfileId,
            chapterId: ch.id,
            status: "IN_PROGRESS",
            programmeMetaHits: nextHits,
          },
          update: {
            status: "IN_PROGRESS",
            programmeMetaHits: nextHits,
          },
        });
      }
    }
  }

  await prisma.studentProfile.update({
    where: { id: studentProfileId },
    data: { errorProfile: withGuidedMetaReplayedFlag(profile?.errorProfile) },
  });
}
