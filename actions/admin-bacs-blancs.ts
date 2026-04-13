"use server";

import { revalidatePath } from "next/cache";
import { Niveau, Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function requireAdmin() {
  return auth().then((s) => {
    if (!s?.user?.id || s.user.role !== "ADMIN") {
      return null;
    }
    return s.user.id;
  });
}

const createSchema = z
  .object({
    mode: z.enum(["single", "bulk"]),
    userId: z.string().min(1).optional(),
    bulkNiveau: z.nativeEnum(Niveau).optional(),
    subject: z.string().min(1).max(240),
    trimestre: z.coerce.number().int().min(1).max(3),
    sessionNumber: z.coerce.number().int().min(1).max(24),
    niveau: z.nativeEnum(Niveau),
    visioAt: z.string().optional(),
    visioUrl: z.string().max(2000).optional(),
    visioLabel: z.string().max(160).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "single" && !data.userId?.trim()) {
      ctx.addIssue({ code: "custom", message: "Sélectionne un élève.", path: ["userId"] });
    }
    if (data.mode === "bulk" && !data.bulkNiveau) {
      ctx.addIssue({ code: "custom", message: "Sélectionne un niveau.", path: ["bulkNiveau"] });
    }
  });

function parseVisioAt(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeUrl(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.toString();
  } catch {
    return null;
  }
}

type VisioResolved = { visioAt: Date | null; visioUrl: string | null; visioLabel: string | null };

function resolveVisioFields(
  visioAtRaw: string | undefined,
  visioUrlRaw: string | undefined,
  visioLabelRaw: string | undefined,
): { ok: true; data: VisioResolved } | { ok: false; message: string } {
  const visioAt = parseVisioAt(visioAtRaw);
  const urlTrim = visioUrlRaw?.trim();
  let visioUrl: string | null = null;
  if (urlTrim) {
    visioUrl = normalizeUrl(urlTrim);
    if (!visioUrl) {
      return { ok: false, message: "Lien visio invalide (URL complète, ex. https://…)." };
    }
  }
  const visioLabel = visioLabelRaw?.trim() || null;
  return { ok: true, data: { visioAt, visioUrl, visioLabel } };
}

const updateSchema = z.object({
  id: z.string().min(1),
  subject: z.string().min(1).max(240),
  trimestre: z.coerce.number().int().min(1).max(3),
  sessionNumber: z.coerce.number().int().min(1).max(24),
  niveau: z.nativeEnum(Niveau),
  visioAt: z.string().optional(),
  visioUrl: z.string().max(2000).optional(),
  visioLabel: z.string().max(160).optional(),
});

export type AdminBacActionState = { ok: true; message: string } | { ok: false; message: string };

export async function createBacBlancAdmin(
  _prev: AdminBacActionState | undefined,
  formData: FormData,
): Promise<AdminBacActionState> {
  const adminId = await requireAdmin();
  if (!adminId) {
    return { ok: false, message: "Accès réservé aux administrateurs." };
  }

  const parsed = createSchema.safeParse({
    mode: formData.get("mode"),
    userId: (formData.get("userId") as string) || undefined,
    bulkNiveau: (formData.get("bulkNiveau") as string) || undefined,
    subject: formData.get("subject"),
    trimestre: formData.get("trimestre"),
    sessionNumber: formData.get("sessionNumber"),
    niveau: formData.get("niveau"),
    visioAt: (formData.get("visioAt") as string) || undefined,
    visioUrl: (formData.get("visioUrl") as string) || undefined,
    visioLabel: (formData.get("visioLabel") as string) || undefined,
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message ?? "Données invalides.";
    return { ok: false, message: msg };
  }

  const d = parsed.data;
  const visio = resolveVisioFields(d.visioAt, d.visioUrl, d.visioLabel);
  if (!visio.ok) return { ok: false, message: visio.message };
  const { visioAt, visioUrl, visioLabel } = visio.data;

  const base = {
    subject: d.subject.trim(),
    trimestre: d.trimestre,
    sessionNumber: d.sessionNumber,
    niveau: d.niveau,
    visioAt,
    visioUrl,
    visioLabel,
    status: "PENDING" as const,
  };

  try {
    if (d.mode === "single") {
      const student = await prisma.user.findFirst({
        where: { id: d.userId!, role: "STUDENT", studentProfile: { isNot: null } },
        select: { id: true },
      });
      if (!student) {
        return { ok: false, message: "Élève introuvable." };
      }
      await prisma.bacBlanc.create({
        data: { userId: student.id, ...base },
      });
      revalidatePath("/admin/bacs-blancs");
      revalidatePath("/app/bac-blanc");
      return { ok: true, message: "Bac blanc créé pour l’élève." };
    }

    const users = await prisma.user.findMany({
      where: { role: "STUDENT", studentProfile: { niveau: d.bulkNiveau! } },
      select: { id: true },
    });
    if (users.length === 0) {
      return { ok: false, message: "Aucun élève à ce niveau." };
    }
    const result = await prisma.bacBlanc.createMany({
      data: users.map((u) => ({ userId: u.id, ...base })),
      skipDuplicates: true,
    });
    revalidatePath("/admin/bacs-blancs");
    revalidatePath("/app/bac-blanc");
    return {
      ok: true,
      message: `Planification créée pour ${result.count} élève(s) (${users.length} concernés, doublons ignorés).`,
    };
  } catch (e) {
    console.error("[admin bacs]", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        message:
          "Ce trimestre et ce numéro de session existent déjà pour cet élève (ou pour tous les élèves ciblés).",
      };
    }
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erreur lors de la création.",
    };
  }
}

export async function updateBacBlancAdmin(
  _prev: AdminBacActionState | undefined,
  formData: FormData,
): Promise<AdminBacActionState> {
  const adminId = await requireAdmin();
  if (!adminId) {
    return { ok: false, message: "Accès réservé aux administrateurs." };
  }

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    subject: formData.get("subject"),
    trimestre: formData.get("trimestre"),
    sessionNumber: formData.get("sessionNumber"),
    niveau: formData.get("niveau"),
    visioAt: (formData.get("visioAt") as string) || undefined,
    visioUrl: (formData.get("visioUrl") as string) || undefined,
    visioLabel: (formData.get("visioLabel") as string) || undefined,
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message ?? "Données invalides.";
    return { ok: false, message: msg };
  }

  const d = parsed.data;
  const visio = resolveVisioFields(d.visioAt, d.visioUrl, d.visioLabel);
  if (!visio.ok) return { ok: false, message: visio.message };
  const { visioAt, visioUrl, visioLabel } = visio.data;

  try {
    const existing = await prisma.bacBlanc.findUnique({ where: { id: d.id }, select: { id: true } });
    if (!existing) {
      return { ok: false, message: "Planification introuvable." };
    }
    await prisma.bacBlanc.update({
      where: { id: d.id },
      data: {
        subject: d.subject.trim(),
        trimestre: d.trimestre,
        sessionNumber: d.sessionNumber,
        niveau: d.niveau,
        visioAt,
        visioUrl,
        visioLabel,
      },
    });
    revalidatePath("/admin/bacs-blancs");
    revalidatePath("/app/bac-blanc");
    return { ok: true, message: "Modifications enregistrées." };
  } catch (e) {
    console.error("[admin bacs update]", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        message:
          "Ce trimestre et ce numéro de session existent déjà pour cet élève. Choisis d’autres valeurs ou supprime l’autre entrée.",
      };
    }
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erreur lors de l’enregistrement.",
    };
  }
}

export async function deleteBacBlancAdmin(id: string): Promise<AdminBacActionState> {
  const adminId = await requireAdmin();
  if (!adminId) {
    return { ok: false, message: "Accès réservé aux administrateurs." };
  }
  if (!id?.trim()) {
    return { ok: false, message: "Identifiant manquant." };
  }
  try {
    await prisma.bacBlanc.delete({ where: { id } });
    revalidatePath("/admin/bacs-blancs");
    revalidatePath("/app/bac-blanc");
    return { ok: true, message: "Bac blanc supprimé." };
  } catch {
    return { ok: false, message: "Suppression impossible." };
  }
}
