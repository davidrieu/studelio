import { revalidatePath } from "next/cache";
import { applyProgrammeGuidedSessionMeta } from "@/lib/apply-programme-guided-session-meta";
import { bumpProgrammeGuidedMicroProgress } from "@/lib/bump-programme-guided-micro-progress";
import { ensureProgrammeStandardModules } from "@/lib/ensure-programme-standard-modules";
import { inferProgrammeProgressProseFallback } from "@/lib/infer-programme-progress-prose";
import { stripProgrammeGuidedMeta } from "@/lib/programme-guided-meta";
import {
  buildStudelioProgressDeltaFromMeta,
  buildStudelioProgressDeltaMicro,
  type StudelioProgressDeltaPayload,
} from "@/lib/studelio-progress-delta";
import { studelioProgressHintMeta, studelioProgressHintMicro } from "@/lib/studelio-progress-user-hint";

export type PersistProgrammeGuidedProgressResult = {
  studelioProgressHint: string | null;
  studelioProgressDelta: StudelioProgressDeltaPayload;
};

/**
 * Après une réponse André en séance programme : aligne les modules en base, applique META ou micro-bump,
 * retourne le texte court et le détail des points pour l’UI (badges + total session).
 */
export async function persistProgrammeGuidedProgressTurn(input: {
  studentProfileId: string;
  programmeId: string;
  assistantText: string;
}): Promise<PersistProgrammeGuidedProgressResult> {
  const { studentProfileId, programmeId, assistantText } = input;

  await ensureProgrammeStandardModules(programmeId);
  const stripped = stripProgrammeGuidedMeta(assistantText);
  const proseMeta = stripped.meta ? null : inferProgrammeProgressProseFallback(assistantText);

  if (stripped.meta) {
    await applyProgrammeGuidedSessionMeta({
      studentProfileId,
      programmeId,
      meta: stripped.meta,
    });
    return {
      studelioProgressHint: studelioProgressHintMeta(stripped.meta),
      studelioProgressDelta: buildStudelioProgressDeltaFromMeta(stripped.meta, "meta"),
    };
  }

  if (proseMeta) {
    await applyProgrammeGuidedSessionMeta({
      studentProfileId,
      programmeId,
      meta: proseMeta,
    });
    return {
      studelioProgressHint: `${studelioProgressHintMeta(proseMeta)} — pris en compte depuis le résumé Studelio en fin de message.`,
      studelioProgressDelta: buildStudelioProgressDeltaFromMeta(proseMeta, "prose"),
    };
  }

  await bumpProgrammeGuidedMicroProgress({ studentProfileId, programmeId });
  return {
    studelioProgressHint: studelioProgressHintMicro(),
    studelioProgressDelta: buildStudelioProgressDeltaMicro(),
  };
}

export function revalidateProgrammeProgressViews(): void {
  revalidatePath("/app/programme");
  revalidatePath("/app/programme/seance");
  revalidatePath("/app/dashboard");
}
