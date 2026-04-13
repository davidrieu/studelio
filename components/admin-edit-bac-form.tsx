"use client";

import type { BacBlancStatus, Niveau } from "@prisma/client";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { type AdminBacActionState, updateBacBlancAdmin } from "@/actions/admin-bacs-blancs";
import { Button } from "@/components/ui/button";
import { bacBlancStatusLabel, niveauLabel } from "@/lib/labels";

const niveaux = Object.keys(niveauLabel) as Niveau[];

export type AdminBacEditRow = {
  id: string;
  userEmail: string;
  userName: string | null;
  subject: string;
  niveau: Niveau;
  trimestre: number;
  sessionNumber: number;
  status: BacBlancStatus;
  visioAtIso: string | null;
  visioUrl: string | null;
  visioLabel: string | null;
};

function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SubmitLabel() {
  const { pending } = useFormStatus();
  return pending ? "Enregistrement…" : "Enregistrer";
}

const initialState: AdminBacActionState | undefined = undefined;

export function AdminEditBacForm({
  row,
  onCancel,
  onSaved,
}: {
  row: AdminBacEditRow;
  onCancel: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateBacBlancAdmin, initialState);

  useEffect(() => {
    if (state?.ok) {
      onSaved?.();
      router.refresh();
    }
  }, [state, onSaved, router]);

  return (
    <form action={formAction} className="space-y-4 border-t border-[var(--studelio-border)] bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          Modifier · {row.userEmail}
          {row.userName ? <span className="font-normal text-muted-foreground"> — {row.userName}</span> : null}
        </p>
        <span className="text-xs text-muted-foreground">Statut : {bacBlancStatusLabel[row.status]}</span>
      </div>

      <input type="hidden" name="id" value={row.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`edit-subject-${row.id}`} className="text-xs font-medium text-muted-foreground">
            Intitulé (matière / thème)
          </label>
          <input
            id={`edit-subject-${row.id}`}
            name="subject"
            required
            maxLength={240}
            defaultValue={row.subject}
            className="mt-1 w-full max-w-xl rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor={`edit-niveau-${row.id}`} className="text-xs font-medium text-muted-foreground">
            Niveau de l’épreuve
          </label>
          <select
            id={`edit-niveau-${row.id}`}
            name="niveau"
            required
            defaultValue={row.niveau}
            className="mt-1 w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
            <label htmlFor={`edit-trimestre-${row.id}`} className="text-xs font-medium text-muted-foreground">
              Trimestre
            </label>
            <select
              id={`edit-trimestre-${row.id}`}
              name="trimestre"
              required
              defaultValue={row.trimestre}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {[1, 2, 3].map((t) => (
                <option key={t} value={t}>
                  T{t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`edit-session-${row.id}`} className="text-xs font-medium text-muted-foreground">
              N° session
            </label>
            <input
              id={`edit-session-${row.id}`}
              name="sessionNumber"
              type="number"
              min={1}
              max={24}
              required
              defaultValue={row.sessionNumber}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`edit-visioAt-${row.id}`} className="text-xs font-medium text-muted-foreground">
            Date & heure visio (fuseau local)
          </label>
          <input
            id={`edit-visioAt-${row.id}`}
            name="visioAt"
            type="datetime-local"
            defaultValue={isoToDatetimeLocalValue(row.visioAtIso)}
            className="mt-1 w-full max-w-md rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`edit-visioUrl-${row.id}`} className="text-xs font-medium text-muted-foreground">
            Lien de la visio
          </label>
          <input
            id={`edit-visioUrl-${row.id}`}
            name="visioUrl"
            type="url"
            defaultValue={row.visioUrl ?? ""}
            placeholder="https://…"
            className="mt-1 w-full max-w-xl rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`edit-visioLabel-${row.id}`} className="text-xs font-medium text-muted-foreground">
            Libellé optionnel
          </label>
          <input
            id={`edit-visioLabel-${row.id}`}
            name="visioLabel"
            maxLength={160}
            defaultValue={row.visioLabel ?? ""}
            className="mt-1 w-full max-w-xl rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" className="rounded-full">
          <SubmitLabel />
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onCancel}>
          Fermer
        </Button>
      </div>

      {state && !state.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-[var(--studelio-green)]" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
