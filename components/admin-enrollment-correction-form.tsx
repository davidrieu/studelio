"use client";

import type { BacBlancStatus } from "@prisma/client";
import { useFormState, useFormStatus } from "react-dom";
import { type AdminEnrollmentState, updateBlancEnrollmentStaff } from "@/actions/admin-blanc-enrollment";
import { bacBlancStatusLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statuses: BacBlancStatus[] = ["PENDING", "SUBMITTED", "IN_REVIEW", "CORRECTED"];

function SubmitLabel() {
  const { pending } = useFormStatus();
  return pending ? "…" : "Enregistrer";
}

const initial: AdminEnrollmentState | undefined = undefined;

export function AdminEnrollmentCorrectionForm({
  enrollmentId,
  defaultStatus,
  defaultNote,
  defaultCommentaire,
}: {
  enrollmentId: string;
  defaultStatus: BacBlancStatus;
  defaultNote: number | null;
  defaultCommentaire: string | null;
}) {
  const [state, formAction] = useFormState(updateBlancEnrollmentStaff, initial);
  const formId = `enrollment-correction-${enrollmentId}`;

  return (
    <form id={formId} action={formAction} className="mt-3 space-y-3 rounded-lg border border-[var(--studelio-border)]/60 bg-background/80 p-3 text-xs">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-status`} className="font-medium text-muted-foreground">
            Statut
          </label>
          <select
            id={`${formId}-status`}
            name="status"
            required
            defaultValue={defaultStatus}
            className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-1.5"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {bacBlancStatusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${formId}-note`} className="font-medium text-muted-foreground">
            Note /20 (optionnel)
          </label>
          <input
            id={`${formId}-note`}
            name="noteFinale"
            type="text"
            inputMode="decimal"
            placeholder="Ex. 14,5"
            defaultValue={defaultNote != null ? String(defaultNote) : ""}
            className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-1.5"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${formId}-com`} className="font-medium text-muted-foreground">
          Commentaire
        </label>
        <textarea
          id={`${formId}-com`}
          name="commentaire"
          rows={3}
          maxLength={12000}
          defaultValue={defaultCommentaire ?? ""}
          className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-1.5"
        />
      </div>
      <Button type="submit" size="sm" variant="secondary" className="rounded-full">
        <SubmitLabel />
      </Button>
      {state ? (
        <p className={cn("text-xs", state.ok ? "text-[var(--studelio-green)]" : "text-destructive")} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
