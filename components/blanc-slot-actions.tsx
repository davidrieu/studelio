"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { enrollBlancSlot, unenrollBlancSlot } from "@/actions/blanc-slots";
import { Button } from "@/components/ui/button";

export function BlancEnrollButton({ slotId }: { slotId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      className="rounded-full"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const r = await enrollBlancSlot(slotId);
          if (!r.ok) alert(r.message);
          else router.refresh();
        });
      }}
    >
      {pending ? "…" : "M’inscrire"}
    </Button>
  );
}

export function BlancUnenrollButton({ slotId }: { slotId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full text-muted-foreground"
      disabled={pending}
      onClick={() => {
        if (!confirm("Annuler ton inscription à ce créneau ?")) return;
        start(async () => {
          const r = await unenrollBlancSlot(slotId);
          if (!r.ok) alert(r.message);
          else router.refresh();
        });
      }}
    >
      {pending ? "…" : "Me désinscrire"}
    </Button>
  );
}
