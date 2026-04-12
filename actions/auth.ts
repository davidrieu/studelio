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
  "PREMIERE",
  "TERMINALE",
  "BTS",
] as const;

const registerSchema = z
  .object({
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "Au moins 8 caractères"),
    kind: z.enum(["student", "parent"]),
    niveau: z.enum(niveaux).optional(),
  })
  .refine((d) => d.kind !== "student" || d.niveau != null, {
    message: "Niveau requis pour un élève",
    path: ["niveau"],
  });

export type RegisterState =
  | { ok: true; redirect: "/onboarding" | "/parent/dashboard" }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function registerAction(_: RegisterState | undefined, formData: FormData): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    kind: formData.get("kind"),
    niveau: formData.get("niveau") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return { ok: false, message: "Vérifie le formulaire.", fieldErrors };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, message: "Cet email est déjà utilisé." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const name = `${parsed.data.firstName.trim()} ${parsed.data.lastName.trim()}`.trim();
  const role: Role = parsed.data.kind === "student" ? "STUDENT" : "PARENT";

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

      if (role === "STUDENT" && parsed.data.niveau) {
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
      }

      if (role === "PARENT") {
        await tx.parentProfile.create({
          data: { userId: user.id },
        });
      }
    });
  } catch {
    return { ok: false, message: "Impossible de créer le compte pour le moment." };
  }

  return {
    ok: true,
    redirect: role === "STUDENT" ? "/onboarding" : "/parent/dashboard",
  };
}
