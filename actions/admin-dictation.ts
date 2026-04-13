"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

const createSchema = z.object({
  programmeId: z.string().min(1),
  title: z.string().min(1, "Titre requis").max(200),
  audioUrl: z.string().url("URL audio invalide").max(2000),
  correctedText: z.string().min(1, "Texte corrigé requis").max(100_000),
  order: z.coerce.number().int().min(0).max(9999).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  programmeId: z.string().min(1),
  title: z.string().min(1, "Titre requis").max(200),
  audioUrl: z.string().url("URL audio invalide").max(2000),
  correctedText: z.string().min(1, "Texte corrigé requis").max(100_000),
  order: z.coerce.number().int().min(0).max(9999),
});

export type AdminDictationState =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export async function createProgrammeDictationAction(
  _: AdminDictationState | undefined,
  formData: FormData,
): Promise<AdminDictationState> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "Non autorisé." };
  }

  const parsed = createSchema.safeParse({
    programmeId: formData.get("programmeId"),
    title: formData.get("title"),
    audioUrl: formData.get("audioUrl"),
    correctedText: formData.get("correctedText"),
    order: formData.get("order") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return { ok: false, message: "Vérifie le formulaire.", fieldErrors };
  }

  const prog = await prisma.programme.findUnique({
    where: { id: parsed.data.programmeId },
    select: { id: true },
  });
  if (!prog) {
    return { ok: false, message: "Programme introuvable." };
  }

  const order =
    parsed.data.order ??
    (await prisma.programmeDictation.count({ where: { programmeId: prog.id } }));

  try {
    await prisma.programmeDictation.create({
      data: {
        programmeId: prog.id,
        title: parsed.data.title.trim(),
        audioUrl: parsed.data.audioUrl.trim(),
        correctedText: parsed.data.correctedText.trim(),
        order,
      },
    });
  } catch (e) {
    console.error("[createProgrammeDictation]", e);
    return { ok: false, message: "Impossible d’enregistrer." };
  }

  revalidatePath(`/admin/programmes/${prog.id}/dictations`);
  revalidatePath("/admin/programmes");
  revalidatePath("/app/programme");
  return { ok: true, message: "Dictée ajoutée." };
}

export async function updateProgrammeDictationAction(
  _: AdminDictationState | undefined,
  formData: FormData,
): Promise<AdminDictationState> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "Non autorisé." };
  }

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    programmeId: formData.get("programmeId"),
    title: formData.get("title"),
    audioUrl: formData.get("audioUrl"),
    correctedText: formData.get("correctedText"),
    order: formData.get("order") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return { ok: false, message: "Vérifie le formulaire.", fieldErrors };
  }

  const existing = await prisma.programmeDictation.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, programmeId: true },
  });
  if (!existing || existing.programmeId !== parsed.data.programmeId) {
    return { ok: false, message: "Dictée introuvable." };
  }

  try {
    await prisma.programmeDictation.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title.trim(),
        audioUrl: parsed.data.audioUrl.trim(),
        correctedText: parsed.data.correctedText.trim(),
        order: parsed.data.order,
      },
    });
  } catch (e) {
    console.error("[updateProgrammeDictation]", e);
    return { ok: false, message: "Impossible d’enregistrer." };
  }

  revalidatePath(`/admin/programmes/${existing.programmeId}/dictations`);
  revalidatePath("/app/programme");
  return { ok: true, message: "Dictée mise à jour." };
}

export async function deleteProgrammeDictationAction(formData: FormData): Promise<AdminDictationState> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "Non autorisé." };
  }

  const id = (formData.get("id") as string)?.trim();
  const programmeId = (formData.get("programmeId") as string)?.trim();
  if (!id || !programmeId) {
    return { ok: false, message: "Données invalides." };
  }

  const existing = await prisma.programmeDictation.findUnique({
    where: { id },
    select: { programmeId: true },
  });
  if (!existing || existing.programmeId !== programmeId) {
    return { ok: false, message: "Dictée introuvable." };
  }

  try {
    await prisma.programmeDictation.delete({ where: { id } });
  } catch (e) {
    console.error("[deleteProgrammeDictation]", e);
    return { ok: false, message: "Impossible de supprimer." };
  }

  revalidatePath(`/admin/programmes/${programmeId}/dictations`);
  revalidatePath("/app/programme");
  return { ok: true, message: "Dictée supprimée." };
}
