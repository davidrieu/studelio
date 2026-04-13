"use client";

import { useState } from "react";
import { AdminDeleteBlancSlotButton } from "@/components/admin-delete-blanc-slot-button";
import { AdminEditBlancSlotForm, type AdminSlotEditRow } from "@/components/admin-edit-blanc-slot-form";
import { blancKindLabel } from "@/lib/blanc-kind";
import { Button } from "@/components/ui/button";

export function AdminBlancSlotRow({
  row,
  isAdmin,
}: {
  row: AdminSlotEditRow & { enrollmentCount: number };
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <tr className="border-b border-[var(--studelio-border)]/60">
        <td className="py-2 pr-3 align-top font-medium">{row.title}</td>
        <td className="py-2 pr-3 align-top text-xs">{blancKindLabel[row.kind]}</td>
        <td className="py-2 pr-3 align-top text-xs">
          {row.published ? (
            <span className="text-[var(--studelio-green)]">Oui</span>
          ) : (
            <span className="text-muted-foreground">Non</span>
          )}
        </td>
        <td className="py-2 pr-3 align-top text-xs whitespace-nowrap">
          {row.visioAtIso
            ? new Date(row.visioAtIso).toLocaleString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </td>
        <td className="py-2 pr-3 align-top text-xs">{row.enrollmentCount}</td>
        {isAdmin ? (
          <td className="py-2 align-top">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? "Masquer" : "Modifier"}
              </Button>
              <AdminDeleteBlancSlotButton id={row.id} />
            </div>
          </td>
        ) : null}
      </tr>
      {isAdmin && editing ? (
        <tr className="border-b border-[var(--studelio-border)]/60 bg-muted/10">
          <td colSpan={6} className="p-0">
            <AdminEditBlancSlotForm row={row} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
