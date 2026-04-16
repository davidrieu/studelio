"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import type { Niveau, Tag } from "@prisma/client";
import { updateStudentProfileSettingsAction } from "@/actions/student-profile-settings";
import { niveauLabel, niveauxOrdered, suggestedInterests, tagLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const tagsOrdered: Tag[] = [
  "DYSLEXIE",
  "DYSORTHOGRAPHIE",
  "DYSCALCULIE",
  "TDAH",
  "HPI",
  "TROUBLE_ANXIEUX",
];

const selectClassName = cn(
  "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
  "transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
);

function interestsExtraDefault(interests: string[]): string {
  const set = new Set(suggestedInterests as unknown as string[]);
  return interests.filter((i) => !set.has(i)).join(", ");
}

type Props = {
  niveau: Niveau;
  interests: string[];
  tags: Tag[];
};

export function StudentProfileSettingsForm({ niveau, interests, tags }: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateStudentProfileSettingsAction, undefined);
  const extraDefault = interestsExtraDefault(interests);
  const tagSet = new Set(tags);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="settings-niveau" className="text-[var(--studelio-text)]">
          Niveau scolaire
        </Label>
        <p className="text-xs text-muted-foreground">
          Utilisé pour ton programme, les épreuves blanches et les contenus. Après un changement, la progression des
          modules du niveau précédent n’est plus affichée (tu repars sur le nouveau parcours).
        </p>
        <select
          id="settings-niveau"
          name="niveau"
          required
          defaultValue={niveau}
          className={selectClassName}
        >
          {niveauxOrdered.map((n) => (
            <option key={n} value={n}>
              {niveauLabel[n]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="font-display text-base font-semibold text-[var(--studelio-text)]">Profil déclaré</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Besoins éventuels (facultatif) — pour qu’André adapte le ton et les exemples.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {tagsOrdered.map((tag) => (
            <li key={tag}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-2 py-1 hover:bg-[var(--studelio-blue-dim)]">
                <input
                  type="checkbox"
                  name="tags"
                  value={tag}
                  defaultChecked={tagSet.has(tag)}
                  className="mt-1 size-4 rounded border-input"
                />
                <span className="text-sm text-[var(--studelio-text-body)]">{tagLabel[tag]}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-display text-base font-semibold text-[var(--studelio-text)]">Centres d’intérêt</h3>
        <p className="mt-1 text-xs text-muted-foreground">Pour rendre les échanges avec André plus parlants.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {suggestedInterests.map((label) => (
            <li key={label}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-1 hover:bg-[var(--studelio-blue-dim)]">
                <input
                  type="checkbox"
                  name="interests"
                  value={label}
                  defaultChecked={interests.includes(label)}
                  className="size-4 rounded border-input"
                />
                <span className="text-sm text-[var(--studelio-text-body)]">{label}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-2">
          <Label htmlFor="interestsExtra">Autres centres d’intérêt (mots séparés par des virgules)</Label>
          <Input
            id="interestsExtra"
            name="interestsExtra"
            defaultValue={extraDefault}
            placeholder="Ex. : astronomie, cuisine, manga"
            className="rounded-xl"
          />
        </div>
      </div>

      {state && !state.ok && state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.ok && state.message ? (
        <p className="rounded-lg border border-[var(--studelio-green-dim)] bg-[var(--studelio-green-dim)]/40 px-3 py-2 text-sm text-[var(--studelio-text)]" role="status">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full rounded-full sm:w-auto">
        Enregistrer le profil
      </Button>
    </form>
  );
}
