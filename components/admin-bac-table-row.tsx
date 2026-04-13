"use client";

import { useState } from "react";
import { AdminDeleteBacButton } from "@/components/admin-delete-bac-button";
import { AdminEditBacForm, type AdminBacEditRow } from "@/components/admin-edit-bac-form";
import { bacBlancStatusLabel, niveauLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";

export function AdminBacTableRow({ row, isAdmin }: { row: AdminBacEditRow; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <tr className="border-b border-[var(--studelio-border)]/60">
        <td className="py-2 pr-3 align-top">
          <div className="font-medium">{row.userEmail}</div>
          {row.userName ? <div className="text-xs text-muted-foreground">{row.userName}</div> : null}
        </td>
        <td className="py-2 pr-3 align-top">
          <div>{row.subject}</div>
          <div className="text-xs text-muted-foreground">{niveauLabel[row.niveau]}</div>
        </td>
        <td className="py-2 pr-3 align-top whitespace-nowrap">
          T{row.trimestre} · S{row.sessionNumber}
        </td>
        <td className="py-2 pr-3 align-top text-xs">
          {row.visioAtIso ? (
            <div>
              {new Date(row.visioAtIso).toLocaleString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
          {row.visioUrl ? (
            <a
              href={row.visioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-[var(--studelio-blue)] underline"
            >
              Lien visio
            </a>
          ) : null}
          {row.visioLabel ? <div className="mt-0.5 text-muted-foreground">{row.visioLabel}</div> : null}
        </td>
        <td className="py-2 pr-3 align-top">{bacBlancStatusLabel[row.status]}</td>
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
              <AdminDeleteBacButton id={row.id} />
            </div>
          </td>
        ) : null}
      </tr>
      {isAdmin && editing ? (
        <tr className="border-b border-[var(--studelio-border)]/60 bg-muted/10">
          <td colSpan={6} className="p-0">
            <AdminEditBacForm row={row} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
