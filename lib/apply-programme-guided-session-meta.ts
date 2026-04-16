import { prisma } from "@/lib/prisma";
import { labelToPrismaField, type ParsedProgrammeGuidedMeta } from "@/lib/programme-guided-meta";
import { metaModulePointsPerChapter, metaRadarPointsPerSkill, MODULE_COMPLETION_UNITS } from "@/lib/programme-module-progress";

function clamp100(n: number): number {
  return Math.min(100, Math.max(0, n));
}

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

/**
 * Met à jour les scores radar et la progression des modules selon le META André et le **résultat** (`outcome`).
 * `fail` → aucune écriture.
 */
export async function applyProgrammeGuidedSessionMeta(input: {
  studentProfileId: string;
  programmeId: string;
  meta: ParsedProgrammeGuidedMeta;
}): Promise<void> {
  const { studentProfileId, programmeId, meta } = input;
  const outcome = meta.outcome;
  const radarStep = metaRadarPointsPerSkill(outcome);
  const moduleStep = metaModulePointsPerChapter(outcome);
  if (radarStep <= 0 && moduleStep <= 0) {
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      if (meta.skills.length > 0 && radarStep > 0) {
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
        for (const lab of meta.skills) {
          const field = labelToPrismaField(lab);
          cur[field] = clamp100(cur[field] + radarStep);
        }
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
      }

      if (moduleStep > 0) {
        for (const order of meta.chapterOrders) {
          const chapter = await tx.programmeChapter.findFirst({
            where: { programmeId, order },
            select: { id: true },
          });
          if (!chapter) continue;

          const row = await tx.studentChapterProgress.findUnique({
            where: {
              studentProfileId_chapterId: { studentProfileId, chapterId: chapter.id },
            },
          });

          if (!row) {
            await tx.studentChapterProgress.create({
              data: {
                studentProfileId,
                chapterId: chapter.id,
                status: "IN_PROGRESS",
                programmeMetaHits: Math.min(MODULE_COMPLETION_UNITS - 0.01, moduleStep),
              },
            });
            continue;
          }

          const nextHits = row.programmeMetaHits + moduleStep;

          if (row.status === "NOT_STARTED") {
            await tx.studentChapterProgress.update({
              where: {
                studentProfileId_chapterId: { studentProfileId, chapterId: chapter.id },
              },
              data: {
                status: "IN_PROGRESS",
                programmeMetaHits: Math.min(MODULE_COMPLETION_UNITS - 0.01, nextHits),
              },
            });
          } else if (row.status === "IN_PROGRESS") {
            if (nextHits >= MODULE_COMPLETION_UNITS) {
              await tx.studentChapterProgress.update({
                where: {
                  studentProfileId_chapterId: { studentProfileId, chapterId: chapter.id },
                },
                data: { status: "COMPLETED", programmeMetaHits: MODULE_COMPLETION_UNITS },
              });
            } else {
              await tx.studentChapterProgress.update({
                where: {
                  studentProfileId_chapterId: { studentProfileId, chapterId: chapter.id },
                },
                data: { programmeMetaHits: nextHits },
              });
            }
          }
        }
      }
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}
