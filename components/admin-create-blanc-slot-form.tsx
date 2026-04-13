"use client";

import type { BlancKind } from "@prisma/client";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { type AdminBlancSlotState, createBlancSlotAdmin } from "@/actions/admin-blanc-slots";
import { blancKindLabel } from "@/lib/blanc-kind";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const kinds: BlancKind[] = ["BREVET_BLANC", "BAC_BLANC"];

function SubmitLabel() {
  const { pending } = useFormStatus();
  return pending ? "Création…" : "Publier le créneau";
}

const initial: AdminBlancSlotState | undefined = undefined;

export function AdminCreateBlancSlotForm() {
  const [state, formAction] = useFormState(createBlancSlotAdmin, initial);

  useEffect(() => {
    if (state?.ok) {
      const f = document.getElementById("admin-create-blanc-slot") as HTMLFormElement | null;
      f?.reset();
    }
  }, [state]);

  return (
    <form id="admin-create-blanc-slot" action={formAction} className="mt-6 space-y-4">
      <div>
        <label htmlFor="slot-title" className="text-xs font-medium text-muted-foreground">
          Titre (matière / thème)
        </label>
        <input
          id="slot-title"
          name="title"
          required
          maxLength={240}
          className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          placeholder="Ex. Français — sujet type brevet"
        />
      </div>
      <div>
        <label htmlFor="slot-kind" className="text-xs font-medium text-muted-foreground">
          Public
        </label>
        <select
          id="slot-kind"
          name="kind"
          required
          className="mt-1 w-full max-w-md rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          defaultValue="BREVET_BLANC"
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {blancKindLabel[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="slot-desc" className="text-xs font-medium text-muted-foreground">
          Description (optionnel)
        </label>
        <textarea
          id="slot-desc"
          name="description"
          rows={3}
          maxLength={4000}
          className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="slot-visioAt" className="text-xs font-medium text-muted-foreground">
            Date & heure visio
          </label>
          <input
            id="slot-visioAt"
            name="visioAt"
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="slot-visioUrl" className="text-xs font-medium text-muted-foreground">
            Lien visio (visible uniquement aux inscrits)
          </label>
          <input
            id="slot-visioUrl"
            name="visioUrl"
            type="url"
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="slot-visioLabel" className="text-xs font-medium text-muted-foreground">
            Libellé visio (optionnel)
          </label>
          <input
            id="slot-visioLabel"
            name="visioLabel"
            maxLength={160}
            className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="slot-capacity" className="text-xs font-medium text-muted-foreground">
            Places max (vide = illimité)
          </label>
          <input
            id="slot-capacity"
            name="capacity"
            type="number"
            min={1}
            max={5000}
            className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="slot-closesAt" className="text-xs font-medium text-muted-foreground">
            Clôture inscriptions (optionnel)
          </label>
          <input
            id="slot-closesAt"
            name="closesAt"
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" name="published" className="accent-[var(--studelio-blue)]" />
        Visible pour les élèves (publié)
      </label>
      <Button type="submit" className="rounded-full">
        <SubmitLabel />
      </Button>
      {state ? (
        <p
          className={cn("text-sm", state.ok ? "text-[var(--studelio-green)]" : "text-destructive")}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
