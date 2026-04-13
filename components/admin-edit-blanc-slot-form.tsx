"use client";

import type { BlancKind } from "@prisma/client";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { type AdminBlancSlotState, updateBlancSlotAdmin } from "@/actions/admin-blanc-slots";
import { blancKindLabel } from "@/lib/blanc-kind";
import { Button } from "@/components/ui/button";

const kinds: BlancKind[] = ["BREVET_BLANC", "BAC_BLANC"];

export type AdminSlotEditRow = {
  id: string;
  title: string;
  kind: BlancKind;
  description: string | null;
  visioAtIso: string | null;
  visioUrl: string | null;
  visioLabel: string | null;
  published: boolean;
  capacity: number | null;
  closesAtIso: string | null;
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

const initial: AdminBlancSlotState | undefined = undefined;

export function AdminEditBlancSlotForm({
  row,
  onCancel,
  onSaved,
}: {
  row: AdminSlotEditRow;
  onCancel: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateBlancSlotAdmin, initial);

  useEffect(() => {
    if (state?.ok) {
      onSaved?.();
      router.refresh();
    }
  }, [state, onSaved, router]);

  return (
    <form action={formAction} className="space-y-4 border-t border-[var(--studelio-border)] bg-muted/20 p-4">
      <input type="hidden" name="id" value={row.id} />
      <p className="text-sm font-medium">Modifier le créneau</p>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Titre</label>
        <input
          name="title"
          required
          maxLength={240}
          defaultValue={row.title}
          className="mt-1 w-full max-w-xl rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Public</label>
        <select
          name="kind"
          required
          defaultValue={row.kind}
          className="mt-1 w-full max-w-md rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {blancKindLabel[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <textarea
          name="description"
          rows={3}
          maxLength={4000}
          defaultValue={row.description ?? ""}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Date & heure visio</label>
          <input
            name="visioAt"
            type="datetime-local"
            defaultValue={isoToDatetimeLocalValue(row.visioAtIso)}
            className="mt-1 w-full max-w-md rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Lien visio</label>
          <input
            name="visioUrl"
            type="url"
            defaultValue={row.visioUrl ?? ""}
            className="mt-1 w-full max-w-xl rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Libellé visio</label>
          <input
            name="visioLabel"
            maxLength={160}
            defaultValue={row.visioLabel ?? ""}
            className="mt-1 w-full max-w-xl rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Places max (vide = illimité)</label>
          <input
            name="capacity"
            type="number"
            min={1}
            max={5000}
            defaultValue={row.capacity ?? ""}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Clôture inscriptions</label>
          <input
            name="closesAt"
            type="datetime-local"
            defaultValue={isoToDatetimeLocalValue(row.closesAtIso)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={row.published} className="accent-[var(--studelio-blue)]" />
        Publié (visible par les élèves)
      </label>
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
