"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteBlancSlotAdmin } from "@/actions/admin-blanc-slots";
import { Button } from "@/components/ui/button";

export function AdminDeleteBlancSlotButton({ id }: { id: string }) {
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
        if (!confirm("Supprimer ce créneau et toutes les inscriptions associées ?")) return;
        startTransition(async () => {
          const r = await deleteBlancSlotAdmin(id);
          if (r.ok) router.refresh();
          else alert(r.message);
        });
      }}
    >
      {pending ? "…" : "Supprimer"}
    </Button>
  );
}
