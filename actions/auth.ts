"use server";

import { Niveau, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const niveaux = [
  "SIXIEME",
  "CINQUIEME",
  "QUATRIEME",
  "TROISIEME",
  "SECONDE",
  "PREMIERE_GENERALE",
  "PREMIERE_TECHNOLOGIQUE",
  "TERMINALE",
  "BTS",
] as const;

const registerSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Au moins 8 caractères"),
  niveau: z.enum(niveaux),
});

export type RegisterState =
  | {
      ok: true;
      redirect: "/onboarding";
      email: string;
    }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function registerAction(_: RegisterState | undefined, formData: FormData): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    niveau: formData.get("niveau") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return { ok: false, message: "Vérifie le formulaire.", fieldErrors };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, message: "Cet email est déjà utilisé." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  const name = `${firstName} ${lastName}`.trim();
  const role: Role = "STUDENT";

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: passwordHash,
          role,
        },
      });

      await tx.subscription.create({
        data: {
          userId: user.id,
          stripeCustomerId: `pending_${user.id}`,
          status: "INCOMPLETE",
          plan: "ESSENTIEL",
        },
      });

      const niveau = parsed.data.niveau as Niveau;
      const programme = await tx.programme.findUnique({ where: { niveau } });
      await tx.studentProfile.create({
        data: {
          userId: user.id,
          niveau,
          interests: [],
          tags: [],
          ...(programme?.id ? { programmeId: programme.id } : {}),
        },
      });
    });
  } catch (e) {
    console.error("[register]", e);
    return { ok: false, message: "Impossible de créer le compte pour le moment." };
  }

  return {
    ok: true,
    redirect: "/onboarding",
    email,
  };
}
