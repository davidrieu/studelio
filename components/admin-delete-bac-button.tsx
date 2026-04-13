"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteBacBlancAdmin } from "@/actions/admin-bacs-blancs";
import { Button } from "@/components/ui/button";

export function AdminDeleteBacButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full text-destructive hover:bg-destructive/10"
      disabled={pending}
      onClick={() => {
        if (!confirm("Supprimer cette planification de bac blanc ?")) return;
        startTransition(async () => {
          const r = await deleteBacBlancAdmin(id);
          if (r.ok) router.refresh();
          else alert(r.message);
        });
      }}
    >
      {pending ? "…" : "Supprimer"}
    </Button>
  );
}
