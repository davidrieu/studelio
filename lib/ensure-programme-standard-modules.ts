import { prisma } from "@/lib/prisma";
import { STUDELIO_STANDARD_MODULES_DEF } from "@/lib/studelio-standard-modules";

/**
 * Aligne la base sur les 6 modules Studelio canoniques (titres, descriptions, skills).
 * Crée les ordres manquants, met à jour les existants, supprime tout ordre > 6.
 * À appeler au chargement de /app/programme et avant le prompt séance guidée.
 */
export async function ensureProgrammeStandardModules(programmeId: string): Promise<void> {
  const existing = await prisma.programmeChapter.findMany({
    where: { programmeId },
    select: { id: true, order: true },
  });
  const byOrder = new Map(existing.map((r) => [r.order, r]));

  for (const def of STUDELIO_STANDARD_MODULES_DEF) {
    const row = byOrder.get(def.order);
    if (!row) {
      await prisma.programmeChapter.create({
        data: {
          programmeId,
          order: def.order,
          title: def.title,
          description: def.description,
          objectives: def.objectives,
          skills: def.skills,
          systemPrompt: null,
        },
      });
    } else {
      await prisma.programmeChapter.update({
        where: { id: row.id },
        data: {
          title: def.title,
          description: def.description,
          objectives: def.objectives,
          skills: def.skills,
          systemPrompt: null,
        },
      });
    }
  }

  await prisma.programmeChapter.deleteMany({
    where: { programmeId, order: { gt: 6 } },
  });
}
