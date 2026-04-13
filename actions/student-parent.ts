"use server";

import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  parentEmail: z.string().email("Email invalide"),
  parentPassword: z.string().min(8, "Au moins 8 caractères pour le mot de passe parent"),
});

export type AddParentTutorState =
  | { ok: true; message: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export async function addParentTutorAction(
  _: AddParentTutorState | undefined,
  formData: FormData,
): Promise<AddParentTutorState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Tu dois être connecté·e." };
  }

  const studentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { studentProfile: true },
  });

  const sp = studentUser?.studentProfile;
  if (!sp) {
    return { ok: false, message: "Profil élève introuvable." };
  }

  if (!sp.onboardingCompletedAt) {
    return {
      ok: false,
      message: "Termine d’abord l’onboarding avant d’ajouter un parent ou tuteur.",
    };
  }

  const studentEmail = studentUser!.email.trim().toLowerCase();

  const parsed = schema.safeParse({
    parentEmail: formData.get("parentEmail"),
    parentPassword: formData.get("parentPassword"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return { ok: false, message: "Vérifie le formulaire.", fieldErrors };
  }

  const parentEmail = parsed.data.parentEmail.trim().toLowerCase();
  if (parentEmail === studentEmail) {
    return {
      ok: false,
      fieldErrors: { parentEmail: ["L’adresse doit être celle du parent ou tuteur, pas la tienne."] },
    };
  }

  const parentPassword = parsed.data.parentPassword;
  const studentFirstName = studentUser!.name?.trim().split(/\s+/)[0] ?? "l’élève";

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: parentEmail },
        include: { parentProfile: true },
      });

      let parentProfileId: string;

      if (!existing) {
        const hash = await bcrypt.hash(parentPassword, 12);
        const parentUser = await tx.user.create({
          data: {
            email: parentEmail,
            name: `Parent / tuteur de ${studentFirstName}`,
            password: hash,
            role: "PARENT",
            subscription: {
              create: {
                stripeCustomerId: `pending_parent_${randomUUID()}`,
                status: "INCOMPLETE",
                plan: "ESSENTIEL",
              },
            },
            parentProfile: { create: {} },
          },
          include: { parentProfile: true },
        });
        if (!parentUser.parentProfile) {
          throw new Error("PARENT_PROFILE_MISSING");
        }
        parentProfileId = parentUser.parentProfile.id;
      } else {
        if (existing.role !== "PARENT" || !existing.parentProfile) {
          throw new Error("EMAIL_NOT_PARENT");
        }
        if (!existing.password) {
          throw new Error("PARENT_NO_PASSWORD");
        }
        const match = await bcrypt.compare(parentPassword, existing.password);
        if (!match) {
          throw new Error("PARENT_WRONG_PASSWORD");
        }
        parentProfileId = existing.parentProfile.id;
      }

      await tx.studentProfile.update({
        where: { id: sp.id },
        data: { parentId: parentProfileId },
      });
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "EMAIL_NOT_PARENT") {
        return {
          ok: false,
          fieldErrors: {
            parentEmail: ["Cette adresse est déjà utilisée par un compte qui n’est pas un parent."],
          },
        };
      }
      if (e.message === "PARENT_NO_PASSWORD") {
        return {
          ok: false,
          message:
            "Ce compte parent existe déjà avec une connexion sans mot de passe (ex. Google). Le parent doit utiliser cette méthode pour se connecter.",
        };
      }
      if (e.message === "PARENT_WRONG_PASSWORD") {
        return {
          ok: false,
          fieldErrors: { parentPassword: ["Mot de passe incorrect pour ce compte parent."] },
        };
      }
    }
    console.error("[addParentTutor]", e);
    return { ok: false, message: "Impossible d’enregistrer le compte parent pour le moment." };
  }

  revalidatePath("/app/dashboard");
  return {
    ok: true,
    message: "Compte parent ou tuteur enregistré. Il peut se connecter tout de suite avec cet email et ce mot de passe — aucun email n’est envoyé depuis Studelio.",
  };
}
