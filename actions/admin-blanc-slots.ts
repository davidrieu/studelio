"use server";

import { revalidatePath } from "next/cache";
import { BlancKind, Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function requireAdmin() {
  return auth().then((s) => {
    if (!s?.user?.id || s.user.role !== "ADMIN") return null;
    return s.user.id;
  });
}

function parseVisioAt(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeUrl(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    return new URL(t).toString();
  } catch {
    return null;
  }
}

function resolveVisioFields(
  visioAtRaw: string | undefined,
  visioUrlRaw: string | undefined,
  visioLabelRaw: string | undefined,
): { ok: true; visioAt: Date | null; visioUrl: string | null; visioLabel: string | null } | { ok: false; message: string } {
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
  return { ok: true, visioAt, visioUrl, visioLabel };
}

function normalizeOptionalUrl(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    return new URL(t).toString();
  } catch {
    return null;
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(240),
  kind: z.nativeEnum(BlancKind),
  description: z.string().max(4000).optional(),
  sujetUrl: z.string().max(2000).optional(),
  visioAt: z.string().optional(),
  visioUrl: z.string().max(2000).optional(),
  visioLabel: z.string().max(160).optional(),
  published: z.coerce.boolean().optional(),
  capacity: z.coerce.number().int().min(1).max(5000).optional().nullable(),
  closesAt: z.string().optional(),
});

const updateSchema = createSchema.extend({
  id: z.string().min(1),
});

export type AdminBlancSlotState = { ok: true; message: string } | { ok: false; message: string };

function parseClosesAt(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createBlancSlotAdmin(
  _prev: AdminBlancSlotState | undefined,
  formData: FormData,
): Promise<AdminBlancSlotState> {
  const adminId = await requireAdmin();
  if (!adminId) return { ok: false, message: "Accès réservé aux administrateurs." };

  const capRaw = formData.get("capacity") as string;
  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    kind: formData.get("kind"),
    description: (formData.get("description") as string) || undefined,
    sujetUrl: (formData.get("sujetUrl") as string) || undefined,
    visioAt: (formData.get("visioAt") as string) || undefined,
    visioUrl: (formData.get("visioUrl") as string) || undefined,
    visioLabel: (formData.get("visioLabel") as string) || undefined,
    published: formData.get("published") === "on",
    capacity: capRaw?.trim() ? Number(capRaw) : undefined,
    closesAt: (formData.get("closesAt") as string) || undefined,
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message ?? "Données invalides.";
    return { ok: false, message: msg };
  }

  const d = parsed.data;
  const visio = resolveVisioFields(d.visioAt, d.visioUrl, d.visioLabel);
  if (!visio.ok) return { ok: false, message: visio.message };
  const sujetUrlRaw = d.sujetUrl?.trim();
  const sujetUrl = sujetUrlRaw ? normalizeOptionalUrl(sujetUrlRaw) : null;
  if (sujetUrlRaw && !sujetUrl) {
    return { ok: false, message: "Lien du sujet invalide (URL complète, ex. https://…)." };
  }
  const closesAt = parseClosesAt(d.closesAt);
  const capacity = d.capacity === undefined || d.capacity === null || Number.isNaN(d.capacity) ? null : d.capacity;

  try {
    await prisma.blancSlot.create({
      data: {
        title: d.title.trim(),
        kind: d.kind,
        description: d.description?.trim() || null,
        sujetUrl,
        visioAt: visio.visioAt,
        visioUrl: visio.visioUrl,
        visioLabel: visio.visioLabel,
        published: d.published ?? false,
        capacity,
        closesAt,
      },
    });
    revalidatePath("/admin/bacs-blancs");
    revalidatePath("/app/bac-blanc");
    return { ok: true, message: "Créneau créé." };
  } catch (e) {
    console.error("[admin blanc slot]", e);
    return { ok: false, message: "Impossible de créer le créneau." };
  }
}

export async function updateBlancSlotAdmin(
  _prev: AdminBlancSlotState | undefined,
  formData: FormData,
): Promise<AdminBlancSlotState> {
  const adminId = await requireAdmin();
  if (!adminId) return { ok: false, message: "Accès réservé aux administrateurs." };

  const capRaw = formData.get("capacity") as string;
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    kind: formData.get("kind"),
    description: (formData.get("description") as string) || undefined,
    sujetUrl: (formData.get("sujetUrl") as string) || undefined,
    visioAt: (formData.get("visioAt") as string) || undefined,
    visioUrl: (formData.get("visioUrl") as string) || undefined,
    visioLabel: (formData.get("visioLabel") as string) || undefined,
    published: formData.get("published") === "on",
    capacity: capRaw?.trim() ? Number(capRaw) : undefined,
    closesAt: (formData.get("closesAt") as string) || undefined,
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message ?? "Données invalides.";
    return { ok: false, message: msg };
  }

  const d = parsed.data;
  const visio = resolveVisioFields(d.visioAt, d.visioUrl, d.visioLabel);
  if (!visio.ok) return { ok: false, message: visio.message };
  const sujetUrlRaw = d.sujetUrl?.trim();
  const sujetUrl = sujetUrlRaw ? normalizeOptionalUrl(sujetUrlRaw) : null;
  if (sujetUrlRaw && !sujetUrl) {
    return { ok: false, message: "Lien du sujet invalide (URL complète, ex. https://…)." };
  }
  const closesAt = parseClosesAt(d.closesAt);
  const capacity = d.capacity === undefined || d.capacity === null || Number.isNaN(d.capacity) ? null : d.capacity;

  try {
    const existing = await prisma.blancSlot.findUnique({ where: { id: d.id }, select: { id: true } });
    if (!existing) return { ok: false, message: "Créneau introuvable." };

    await prisma.blancSlot.update({
      where: { id: d.id },
      data: {
        title: d.title.trim(),
        kind: d.kind,
        description: d.description?.trim() || null,
        sujetUrl,
        visioAt: visio.visioAt,
        visioUrl: visio.visioUrl,
        visioLabel: visio.visioLabel,
        published: d.published ?? false,
        capacity,
        closesAt,
      },
    });
    revalidatePath("/admin/bacs-blancs");
    revalidatePath("/app/bac-blanc");
    return { ok: true, message: "Créneau mis à jour." };
  } catch (e) {
    console.error("[admin blanc slot update]", e);
    return { ok: false, message: "Impossible d’enregistrer." };
  }
}

export async function deleteBlancSlotAdmin(id: string): Promise<AdminBlancSlotState> {
  const adminId = await requireAdmin();
  if (!adminId) return { ok: false, message: "Accès réservé aux administrateurs." };
  if (!id?.trim()) return { ok: false, message: "Identifiant manquant." };
  try {
    await prisma.blancSlot.delete({ where: { id } });
    revalidatePath("/admin/bacs-blancs");
    revalidatePath("/app/bac-blanc");
    return { ok: true, message: "Créneau supprimé." };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, message: "Créneau déjà supprimé." };
    }
    return { ok: false, message: "Suppression impossible." };
  }
}
