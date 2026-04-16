import { prisma } from "@/lib/prisma";
import {
  MODULE_COMPLETION_UNITS,
  MODULE_MICRO_BUMP_PER_EXCHANGE,
} from "@/lib/programme-module-progress";

/** Petit bonus radar à chaque échange sans META (les entiers 0–100 restent lisibles). */
const RADAR_MICRO_PER_EXCHANGE = 2;

type Row = {
  grammaire: number;
  orthographe: number;
  conjugaison: number;
  vocabulaire: number;
  expressionEcrite: number;
  lecture: number;
};

const ZEROS: Row = {
  grammaire: 0,
  orthographe: 0,
  conjugaison: 0,
  vocabulaire: 0,
  expressionEcrite: 0,
  lecture: 0,
};

function clamp100(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Progression « gratuite » à chaque tour de séance programme lorsqu’André n’a pas renvoyé de META :
 * léger gain radar + quelques points sur le module actiflement suivi (premier en cours, sinon premier pas commencé).
 */
export async function bumpProgrammeGuidedMicroProgress(input: {
  studentProfileId: string;
  programmeId: string;
}): Promise<void> {
  const { studentProfileId, programmeId } = input;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.studentCompetencyProgress.findUnique({
      where: { studentProfileId },
    });
    const cur: Row = existing
      ? {
          grammaire: existing.grammaire,
          orthographe: existing.orthographe,
          conjugaison: existing.conjugaison,
          vocabulaire: existing.vocabulaire,
          expressionEcrite: existing.expressionEcrite,
          lecture: existing.lecture,
        }
      : { ...ZEROS };
    (Object.keys(ZEROS) as (keyof Row)[]).forEach((k) => {
      cur[k] = clamp100(cur[k] + RADAR_MICRO_PER_EXCHANGE);
    });
    await tx.studentCompetencyProgress.upsert({
      where: { studentProfileId },
      create: {
        studentProfileId,
        grammaire: cur.grammaire,
        orthographe: cur.orthographe,
        conjugaison: cur.conjugaison,
        vocabulaire: cur.vocabulaire,
        expressionEcrite: cur.expressionEcrite,
        lecture: cur.lecture,
      },
      update: {
        grammaire: cur.grammaire,
        orthographe: cur.orthographe,
        conjugaison: cur.conjugaison,
        vocabulaire: cur.vocabulaire,
        expressionEcrite: cur.expressionEcrite,
        lecture: cur.lecture,
      },
    });

    const chapters = await tx.programmeChapter.findMany({
      where: { programmeId },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    if (chapters.length === 0) {
      console.warn("[bumpProgrammeGuidedMicroProgress] aucun ProgrammeChapter pour programmeId=", programmeId);
      return;
    }

    const bumpChapter = async (chapterId: string, row: { status: string; programmeMetaHits: number } | null) => {
      const status = (row?.status ?? "NOT_STARTED") as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
      const curHits = row?.programmeMetaHits ?? 0;
      const next = curHits + MODULE_MICRO_BUMP_PER_EXCHANGE;

      if (!row) {
        await tx.studentChapterProgress.create({
          data: {
            studentProfileId,
            chapterId,
            status: "IN_PROGRESS",
            programmeMetaHits: Math.min(MODULE_COMPLETION_UNITS - 1, MODULE_MICRO_BUMP_PER_EXCHANGE),
          },
        });
        return;
      }

      if (status === "NOT_STARTED") {
        await tx.studentChapterProgress.update({
          where: {
            studentProfileId_chapterId: { studentProfileId, chapterId },
          },
          data: {
            status: "IN_PROGRESS",
            programmeMetaHits: Math.min(MODULE_COMPLETION_UNITS - 1, next),
          },
        });
        return;
      }

      if (status === "IN_PROGRESS") {
        if (next >= MODULE_COMPLETION_UNITS) {
          await tx.studentChapterProgress.update({
            where: {
              studentProfileId_chapterId: { studentProfileId, chapterId },
            },
            data: { status: "COMPLETED", programmeMetaHits: MODULE_COMPLETION_UNITS },
          });
        } else {
          await tx.studentChapterProgress.update({
            where: {
              studentProfileId_chapterId: { studentProfileId, chapterId },
            },
            data: { programmeMetaHits: next },
          });
        }
      }
    };

    let done = false;
    for (const ch of chapters) {
      const row = await tx.studentChapterProgress.findUnique({
        where: {
          studentProfileId_chapterId: { studentProfileId, chapterId: ch.id },
        },
      });
      const st = row?.status ?? "NOT_STARTED";
      if (st === "COMPLETED") continue;
      if (st === "IN_PROGRESS") {
        await bumpChapter(ch.id, row);
        done = true;
        break;
      }
    }
    if (done) return;

    for (const ch of chapters) {
      const row = await tx.studentChapterProgress.findUnique({
        where: {
          studentProfileId_chapterId: { studentProfileId, chapterId: ch.id },
        },
      });
      const st = row?.status ?? "NOT_STARTED";
      if (st === "NOT_STARTED") {
        await bumpChapter(ch.id, row);
        break;
      }
    }
  });
}
