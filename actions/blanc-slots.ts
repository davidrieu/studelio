"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { blancKindForNiveau } from "@/lib/blanc-kind";
import { planIncludesBlancInSubscription, subscriptionGrantsAppAccess } from "@/lib/subscription-entitlement";
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
    await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { userId: ctx.userId },
        select: { plan: true, status: true },
      });
      if (!sub || !subscriptionGrantsAppAccess(sub)) {
        throw new Error("NO_SUB");
      }

      if (planIncludesBlancInSubscription(sub.plan)) {
        await tx.blancEnrollment.create({
          data: { slotId: slot.id, userId: ctx.userId },
        });
        return;
      }

      const purchase = await tx.blancOneTimePurchase.findFirst({
        where: { userId: ctx.userId, consumedAt: null },
        orderBy: { createdAt: "asc" },
      });
      if (!purchase) {
        throw new Error("NO_BLANC_CREDIT");
      }

      await tx.blancEnrollment.create({
        data: {
          slotId: slot.id,
          userId: ctx.userId,
          blancPurchaseId: purchase.id,
          proCorrectionPurchased: purchase.includesProCorrection,
        },
      });
      await tx.blancOneTimePurchase.update({
        where: { id: purchase.id },
        data: { consumedAt: new Date() },
      });
    });
    revalidatePath("/app/bac-blanc");
    return { ok: true, message: "Inscription enregistrée." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NO_BLANC_CREDIT") {
      return {
        ok: false,
        message:
          "Avec ton offre actuelle, achète une place (15 ou 20 €) ou passe à Excellence pour inclure les examens blancs.",
      };
    }
    if (msg === "NO_SUB") {
      return { ok: false, message: "Abonnement actif requis." };
    }
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
    select: { id: true, status: true, blancPurchaseId: true },
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

  try {
    await prisma.$transaction(async (tx) => {
      if (existing.blancPurchaseId) {
        await tx.blancOneTimePurchase.update({
          where: { id: existing.blancPurchaseId },
          data: { consumedAt: null },
        });
      }
      const deleted = await tx.blancEnrollment.deleteMany({
        where: { id: existing.id, userId: ctx.userId, status: "PENDING" },
      });
      if (deleted.count === 0) {
        throw new Error("NOT_FOUND");
      }
    });
    revalidatePath("/app/bac-blanc");
    return { ok: true, message: "Inscription annulée." };
  } catch {
    return { ok: false, message: "Inscription introuvable." };
  }
}
