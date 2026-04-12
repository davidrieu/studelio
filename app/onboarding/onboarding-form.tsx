"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import type { Niveau } from "@prisma/client";
import { completeOnboardingAction } from "@/actions/onboarding";
import { niveauLabel, suggestedInterests, tagLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Tag } from "@prisma/client";

const tagsOrdered: Tag[] = [
  "DYSLEXIE",
  "DYSORTHOGRAPHIE",
  "DYSCALCULIE",
  "TDAH",
  "HPI",
  "TROUBLE_ANXIEUX",
];

export function OnboardingForm({ niveau }: { niveau: Niveau }) {
  const router = useRouter();
  const [state, formAction] = useFormState(completeOnboardingAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.push("/onboarding/plan");
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="space-y-8">
      <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <p className="text-sm text-muted-foreground">
          Niveau indiqué à l’inscription :{" "}
          <span className="font-medium text-[var(--studelio-text)]">{niveauLabel[niveau]}</span>
        </p>
        <p className="mt-4 text-[var(--studelio-text-body)]">
          Ces infos aident André à adapter le ton et les exemples. Rien n’est obligatoire sauf d’avancer quand tu es prêt·e —
          tu peux cocher zéro besoin spécifique et des centres d’intérêt plus tard.
        </p>
      </div>

      <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h2 className="font-display text-xl font-semibold text-[var(--studelio-text)]">Besoins éventuels</h2>
        <p className="mt-1 text-sm text-muted-foreground">Coche tout ce qui correspond à ta situation (facultatif).</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {tagsOrdered.map((tag) => (
            <li key={tag}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-2 py-1 hover:bg-[var(--studelio-blue-dim)]">
                <input type="checkbox" name="tags" value={tag} className="mt-1 size-4 rounded border-input" />
                <span className="text-sm text-[var(--studelio-text-body)]">{tagLabel[tag]}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[20px] border border-[var(--studelio-border)] bg-card p-6 shadow-[var(--studelio-shadow)] sm:p-8">
        <h2 className="font-display text-xl font-semibold text-[var(--studelio-text)]">Centres d’intérêt</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pour rendre les échanges avec André plus parlants.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {suggestedInterests.map((label) => (
            <li key={label}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-1 hover:bg-[var(--studelio-blue-dim)]">
                <input type="checkbox" name="interests" value={label} className="size-4 rounded border-input" />
                <span className="text-sm text-[var(--studelio-text-body)]">{label}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-2">
          <Label htmlFor="interestsExtra">Autres (mots séparés par des virgules)</Label>
          <Input
            id="interestsExtra"
            name="interestsExtra"
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

      <Button type="submit" className="rounded-full px-8">
        Continuer vers le choix du plan
      </Button>
    </form>
  );
}
