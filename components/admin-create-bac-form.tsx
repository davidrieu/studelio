"use client";

import type { Niveau } from "@prisma/client";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import {
  type AdminBacActionState,
  createBacBlancAdmin,
} from "@/actions/admin-bacs-blancs";
import { Button } from "@/components/ui/button";
import { niveauLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

const niveaux = Object.keys(niveauLabel) as Niveau[];

type StudentOpt = { id: string; email: string; name: string | null; niveau: Niveau };

function SubmitLabel() {
  const { pending } = useFormStatus();
  return pending ? "Création…" : "Créer la planification";
}

const initialState: AdminBacActionState | undefined = undefined;

export function AdminCreateBacForm({ students }: { students: StudentOpt[] }) {
  const [state, formAction] = useFormState(createBacBlancAdmin, initialState);
  const [mode, setMode] = useState<"single" | "bulk">("single");

  useEffect(() => {
    if (state?.ok) {
      const f = document.getElementById("admin-create-bac-form") as HTMLFormElement | null;
      f?.reset();
    }
  }, [state]);

  return (
    <div className="rounded-[12px] border border-[var(--studelio-border)] bg-card p-6">
      <h2 className="font-display text-lg font-semibold">Planifier un bac blanc (visio)</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        L’épreuve se déroule en visioconférence : indique la date/heure et le lien (Zoom, Meet, Teams…). Tu peux cibler
        un élève ou tous les élèves d’un niveau (même créneau).
      </p>

      <form id="admin-create-bac-form" action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="mode" value={mode} />

        <fieldset className="flex flex-wrap gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="modeRadio"
              checked={mode === "single"}
              onChange={() => setMode("single")}
              className="accent-[var(--studelio-blue)]"
            />
            Un élève
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="modeRadio"
              checked={mode === "bulk"}
              onChange={() => setMode("bulk")}
              className="accent-[var(--studelio-blue)]"
            />
            Tous les élèves d’un niveau
          </label>
        </fieldset>

        {mode === "single" ? (
          <div>
            <label htmlFor="userId" className="text-xs font-medium text-muted-foreground">
              Élève
            </label>
            <select
              id="userId"
              name="userId"
              required={mode === "single"}
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Choisir…
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email}
                  {s.name ? ` — ${s.name}` : ""} ({niveauLabel[s.niveau]})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="bulkNiveau" className="text-xs font-medium text-muted-foreground">
              Niveau (tous les élèves)
            </label>
            <select
              id="bulkNiveau"
              name="bulkNiveau"
              required={mode === "bulk"}
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Choisir…
              </option>
              {niveaux.map((n) => (
                <option key={n} value={n}>
                  {niveauLabel[n]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="subject" className="text-xs font-medium text-muted-foreground">
              Intitulé (matière / thème)
            </label>
            <input
              id="subject"
              name="subject"
              required
              maxLength={240}
              placeholder="Ex. Français — Écriture d’invention"
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="niveau" className="text-xs font-medium text-muted-foreground">
              Niveau de l’épreuve (affiché à l’élève)
            </label>
            <select
              id="niveau"
              name="niveau"
              required
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              defaultValue="SIXIEME"
            >
              {niveaux.map((n) => (
                <option key={n} value={n}>
                  {niveauLabel[n]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="trimestre" className="text-xs font-medium text-muted-foreground">
                Trimestre
              </label>
              <select
                id="trimestre"
                name="trimestre"
                required
                className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                defaultValue="1"
              >
                {[1, 2, 3].map((t) => (
                  <option key={t} value={t}>
                    T{t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sessionNumber" className="text-xs font-medium text-muted-foreground">
                N° session
              </label>
              <input
                id="sessionNumber"
                name="sessionNumber"
                type="number"
                min={1}
                max={24}
                required
                defaultValue={1}
                className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="visioAt" className="text-xs font-medium text-muted-foreground">
              Date & heure visio (fuseau local)
            </label>
            <input
              id="visioAt"
              name="visioAt"
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="visioUrl" className="text-xs font-medium text-muted-foreground">
              Lien de la visio
            </label>
            <input
              id="visioUrl"
              name="visioUrl"
              type="url"
              placeholder="https://zoom.us/j/… ou https://meet.google.com/…"
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="visioLabel" className="text-xs font-medium text-muted-foreground">
              Libellé optionnel (salle, code…)
            </label>
            <input
              id="visioLabel"
              name="visioLabel"
              maxLength={160}
              placeholder="Ex. Salle virtuelle A"
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        <Button type="submit" className="rounded-full">
          <SubmitLabel />
        </Button>

        {state ? (
          <p
            className={cn(
              "text-sm",
              state.ok ? "text-[var(--studelio-green)]" : "text-destructive",
            )}
            role="status"
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
