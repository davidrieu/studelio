import { revalidatePath } from "next/cache";
import { applyProgrammeGuidedSessionMeta } from "@/lib/apply-programme-guided-session-meta";
import { ensureProgrammeStandardModules } from "@/lib/ensure-programme-standard-modules";
import { inferProgrammeProgressProseFallback } from "@/lib/infer-programme-progress-prose";
import { stripProgrammeGuidedMeta } from "@/lib/programme-guided-meta";
import { buildStudelioProgressDeltaFromMeta, type StudelioProgressDeltaPayload } from "@/lib/studelio-progress-delta";
import { studelioProgressHintMeta, studelioProgressHintNoPoints } from "@/lib/studelio-progress-user-hint";

export type PersistProgrammeGuidedProgressResult = {
  studelioProgressHint: string | null;
  studelioProgressDelta: StudelioProgressDeltaPayload | null;
};

/**
 * Après une réponse André : META + `outcome`, ou secours prose très modeste ; sinon message neutre.
 * L’API n’appelle pas cette fonction sur le message d’ouverture (bootstrap sans message élève).
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
      studelioProgressHint: `${studelioProgressHintMeta(proseMeta)} — secours texte (mini +).`,
      studelioProgressDelta: buildStudelioProgressDeltaFromMeta(proseMeta, "prose"),
    };
  }

  return {
    studelioProgressHint: studelioProgressHintNoPoints(),
    studelioProgressDelta: null,
  };
}

export function revalidateProgrammeProgressViews(): void {
  revalidatePath("/app/programme");
  revalidatePath("/app/programme/seance");
  revalidatePath("/app/dashboard");
}
