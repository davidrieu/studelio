import type { Niveau } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Résout le programme Studelio « officiel » pour l’élève : celui déjà lié au profil,
 * ou le programme du même niveau en base (puis liaison au profil si elle manquait).
 * Même logique que la page `/app/programme` pour que les chapitres / barres correspondent
 * aux écritures faites depuis l’API chat (séance programme).
 */
export async function ensureStudentProgrammeLinkedToCanonical(input: {
  studentProfileId: string;
  niveau: Niveau;
  programmeIdOnProfile: string | null;
  programmeRelationId: string | null;
}): Promise<string | null> {
  const fromProfile = input.programmeIdOnProfile;
  const fromRelation = input.programmeRelationId;
  const fromNiveau = (
    await prisma.programme.findUnique({
      where: { niveau: input.niveau },
      select: { id: true },
    })
  )?.id;

  const canonical = fromProfile ?? fromRelation ?? fromNiveau ?? null;
  if (!canonical) return null;

  if (!fromProfile) {
    await prisma.studentProfile.update({
      where: { id: input.studentProfileId },
      data: { programmeId: canonical },
    });
  }

  return canonical;
}
