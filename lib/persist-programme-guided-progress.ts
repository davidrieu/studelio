import { revalidatePath } from "next/cache";
import { applyProgrammeGuidedSessionMeta } from "@/lib/apply-programme-guided-session-meta";
import { bumpProgrammeGuidedMicroProgress } from "@/lib/bump-programme-guided-micro-progress";
import { ensureProgrammeStandardModules } from "@/lib/ensure-programme-standard-modules";
import { stripProgrammeGuidedMeta } from "@/lib/programme-guided-meta";
import { studelioProgressHintMeta, studelioProgressHintMicro } from "@/lib/studelio-progress-user-hint";

/**
 * Après une réponse André en séance programme : aligne les modules en base, applique META ou micro-bump,
 * retourne le texte court pour l’UI.
 */
export async function persistProgrammeGuidedProgressTurn(input: {
  studentProfileId: string;
  programmeId: string;
  assistantText: string;
}): Promise<{ studelioProgressHint: string | null }> {
  const { studentProfileId, programmeId, assistantText } = input;

  await ensureProgrammeStandardModules(programmeId);
  const stripped = stripProgrammeGuidedMeta(assistantText);

  if (stripped.meta) {
    await applyProgrammeGuidedSessionMeta({
      studentProfileId,
      programmeId,
      meta: stripped.meta,
    });
    return { studelioProgressHint: studelioProgressHintMeta(stripped.meta) };
  }

  await bumpProgrammeGuidedMicroProgress({ studentProfileId, programmeId });
  return { studelioProgressHint: studelioProgressHintMicro() };
}

export function revalidateProgrammeProgressViews(): void {
  revalidatePath("/app/programme");
  revalidatePath("/app/programme/seance");
  revalidatePath("/app/dashboard");
}
