"use server";

import { revalidatePath } from "next/cache";
import { BacBlancStatus } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function requireStaff() {
  return auth().then((s) => {
    if (!s?.user?.id) return null;
    if (s.user.role !== "ADMIN" && s.user.role !== "CORRECTOR") return null;
    return s.user.id;
  });
}

const updateSchema = z.object({
  enrollmentId: z.string().min(1),
  status: z.nativeEnum(BacBlancStatus),
  noteFinale: z.string().optional(),
  commentaire: z.string().max(12000).optional(),
});

export type AdminEnrollmentState = { ok: true; message: string } | { ok: false; message: string };

export async function updateBlancEnrollmentStaff(
  _prev: AdminEnrollmentState | undefined,
  formData: FormData,
): Promise<AdminEnrollmentState> {
  const staffId = await requireStaff();
  if (!staffId) {
    return { ok: false, message: "Accès réservé aux correcteurs et administrateurs." };
  }

  const parsed = updateSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    status: formData.get("status"),
    noteFinale: (formData.get("noteFinale") as string) || undefined,
    commentaire: (formData.get("commentaire") as string) || undefined,
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message ?? "Données invalides.";
    return { ok: false, message: msg };
  }

  const { enrollmentId, status, commentaire } = parsed.data;
  const noteStr = parsed.data.noteFinale?.trim();
  let noteFinale: number | null = null;
  if (noteStr) {
    const n = Number(noteStr.replace(",", "."));
    if (Number.isNaN(n) || n < 0 || n > 20) {
      return { ok: false, message: "La note doit être un nombre entre 0 et 20." };
    }
    noteFinale = n;
  }

  const existing = await prisma.blancEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, message: "Inscription introuvable." };
  }

  await prisma.blancEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status,
      noteFinale,
      commentaire: commentaire?.trim() || null,
      correcteurId: staffId,
      correctedAt: status === "CORRECTED" ? new Date() : null,
    },
  });

  revalidatePath("/admin/bacs-blancs");
  revalidatePath("/app/bac-blanc");
  return { ok: true, message: "Fiche mise à jour." };
}
