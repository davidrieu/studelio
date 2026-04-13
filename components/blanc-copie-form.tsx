"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitBlancCopie } from "@/actions/blanc-copie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BlancCopieForm({ enrollmentId, defaultUrl }: { enrollmentId: string; defaultUrl: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-4 space-y-2 rounded-xl border border-[var(--studelio-border)]/80 bg-muted/30 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        const url = (fd.get("copieUrl") as string) ?? "";
        start(async () => {
          const r = await submitBlancCopie(enrollmentId, url);
          if (!r.ok) setError(r.message);
          else router.refresh();
        });
      }}
    >
      <Label htmlFor={`copie-${enrollmentId}`} className="text-xs font-medium text-muted-foreground">
        Lien vers ta copie (Drive, PDF, etc.)
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          id={`copie-${enrollmentId}`}
          name="copieUrl"
          type="url"
          required
          defaultValue={defaultUrl}
          placeholder="https://…"
          className="sm:max-w-md"
        />
        <Button type="submit" size="sm" className="rounded-full shrink-0" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer ma copie"}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
