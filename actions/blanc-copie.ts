"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type BlancCopieState = { ok: true; message: string } | { ok: false; message: string };

function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return new URL(t).toString();
  } catch {
    return null;
  }
}

export async function submitBlancCopie(enrollmentId: string, copieUrlRaw: string): Promise<BlancCopieState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return { ok: false, message: "Réservé aux élèves connectés." };
  }
  if (!enrollmentId?.trim()) {
    return { ok: false, message: "Inscription invalide." };
  }

  const url = normalizeUrl(copieUrlRaw ?? "");
  if (!url) {
    return { ok: false, message: "Indique une URL complète vers ta copie (ex. lien Drive, PDF hébergé…)." };
  }

  const enr = await prisma.blancEnrollment.findFirst({
    where: { id: enrollmentId, userId: session.user.id },
    select: { id: true, status: true },
  });
  if (!enr) {
    return { ok: false, message: "Inscription introuvable." };
  }
  if (enr.status !== "PENDING") {
    return { ok: false, message: "Une copie a déjà été enregistrée pour ce créneau." };
  }

  await prisma.blancEnrollment.update({
    where: { id: enr.id },
    data: {
      copieUrl: url,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });
  revalidatePath("/app/bac-blanc");
  revalidatePath("/admin/bacs-blancs");
  return { ok: true, message: "Copie enregistrée." };
}
