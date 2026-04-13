"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { blancKindForNiveau } from "@/lib/blanc-kind";
import { prisma } from "@/lib/prisma";

export type BlancSlotActionState = { ok: true; message: string } | { ok: false; message: string };

async function requireStudentWithNiveau() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return null;
  }
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { niveau: true },
  });
  if (!profile) return null;
  return { userId: session.user.id, niveau: profile.niveau };
}

export async function enrollBlancSlot(slotId: string): Promise<BlancSlotActionState> {
  const ctx = await requireStudentWithNiveau();
  if (!ctx) {
    return { ok: false, message: "Réservé aux élèves connectés." };
  }
  if (!slotId?.trim()) {
    return { ok: false, message: "Créneau invalide." };
  }

  const kind = blancKindForNiveau(ctx.niveau);
  const slot = await prisma.blancSlot.findFirst({
    where: { id: slotId, published: true, kind },
  });
  if (!slot) {
    return { ok: false, message: "Ce créneau n’est pas disponible pour ton niveau." };
  }
  if (slot.closesAt && slot.closesAt < new Date()) {
    return { ok: false, message: "Les inscriptions sont closes pour ce créneau." };
  }

  const count = await prisma.blancEnrollment.count({ where: { slotId: slot.id } });
  if (slot.capacity != null && count >= slot.capacity) {
    return { ok: false, message: "Ce créneau est complet." };
  }

  try {
    await prisma.blancEnrollment.create({
      data: { slotId: slot.id, userId: ctx.userId },
    });
    revalidatePath("/app/bac-blanc");
    return { ok: true, message: "Inscription enregistrée." };
  } catch {
    return { ok: false, message: "Tu es déjà inscrit·e à ce créneau." };
  }
}

export async function unenrollBlancSlot(slotId: string): Promise<BlancSlotActionState> {
  const ctx = await requireStudentWithNiveau();
  if (!ctx) {
    return { ok: false, message: "Réservé aux élèves connectés." };
  }
  if (!slotId?.trim()) {
    return { ok: false, message: "Créneau invalide." };
  }

  const existing = await prisma.blancEnrollment.findFirst({
    where: { slotId, userId: ctx.userId },
    select: { id: true, status: true },
  });
  if (!existing) {
    return { ok: false, message: "Inscription introuvable." };
  }
  if (existing.status !== "PENDING") {
    return {
      ok: false,
      message: "Tu as déjà envoyé une copie ou elle est en correction — contacte l’équipe pour te désinscrire.",
    };
  }

  const deleted = await prisma.blancEnrollment.deleteMany({
    where: { id: existing.id, userId: ctx.userId, status: "PENDING" },
  });
  if (deleted.count === 0) {
    return { ok: false, message: "Inscription introuvable." };
  }
  revalidatePath("/app/bac-blanc");
  return { ok: true, message: "Inscription annulée." };
}
