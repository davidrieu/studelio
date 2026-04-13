"use server";

import { randomUUID } from "node:crypto";
import { Niveau, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateTempPassword } from "@/lib/generate-temp-password";
import { sendParentChildLinkedEmail, sendParentNewAccountEmail } from "@/lib/parent-email";
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
    parentEmail: z.string().optional(),
    password: z.string().min(8, "Au moins 8 caractères"),
    kind: z.enum(["student", "parent"]),
    niveau: z.enum(niveaux).optional(),
  })
  .refine((d) => d.kind !== "student" || d.niveau != null, {
    message: "Niveau requis pour un élève",
    path: ["niveau"],
  })
  .refine(
    (d) => {
      if (d.kind !== "student") return true;
      const p = d.parentEmail?.trim();
      if (!p) return false;
      return z.string().email().safeParse(p).success;
    },
    { message: "L’email du parent est requis et doit être valide", path: ["parentEmail"] },
  )
  .refine(
    (d) => {
      if (d.kind !== "student" || !d.parentEmail?.trim()) return true;
      return d.parentEmail.trim().toLowerCase() !== d.email.trim().toLowerCase();
    },
    {
      message: "L’email du parent doit être différent de celui de l’élève",
      path: ["parentEmail"],
    },
  );

export type RegisterState =
  | {
      ok: true;
      redirect: "/onboarding" | "/parent/dashboard";
      email: string;
      /** Message affiché brièvement après inscription élève (email parent). */
      parentEmailNotice?: string;
    }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function registerAction(_: RegisterState | undefined, formData: FormData): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    parentEmail: (formData.get("parentEmail") as string) || undefined,
    password: formData.get("password"),
    kind: formData.get("kind"),
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
  const role: Role = parsed.data.kind === "student" ? "STUDENT" : "PARENT";

  const parentEmailNormalized =
    parsed.data.kind === "student" && parsed.data.parentEmail?.trim()
      ? parsed.data.parentEmail.trim().toLowerCase()
      : null;

  if (parentEmailNormalized) {
    const parentEmailTaken = await prisma.user.findUnique({
      where: { email: parentEmailNormalized },
      select: { role: true },
    });
    if (parentEmailTaken && parentEmailTaken.role !== "PARENT") {
      return {
        ok: false,
        message: "Cet email est déjà utilisé par un compte qui n’est pas un parent. Utilise une autre adresse.",
        fieldErrors: { parentEmail: ["Email déjà associé à un compte élève ou personnel."] },
      };
    }
  }

  type AfterStudent = {
    kind: "new_parent";
    parentEmail: string;
    tempPassword: string;
    studentName: string;
  } | { kind: "linked_parent"; parentEmail: string; studentName: string };

  let afterStudent: AfterStudent | null = null;

  try {
    afterStudent = await prisma.$transaction(async (tx) => {
      let payload: AfterStudent | null = null;
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
        const studentProfile = await tx.studentProfile.create({
          data: {
            userId: user.id,
            niveau,
            interests: [],
            tags: [],
            ...(programme?.id ? { programmeId: programme.id } : {}),
          },
        });

        if (parentEmailNormalized) {
          const existingParent = await tx.user.findUnique({
            where: { email: parentEmailNormalized },
            include: { parentProfile: true },
          });

          if (existingParent) {
            if (existingParent.role !== "PARENT" || !existingParent.parentProfile) {
              throw new Error("PARENT_EMAIL_INVALID");
            }
            await tx.studentProfile.update({
              where: { id: studentProfile.id },
              data: { parentId: existingParent.parentProfile.id },
            });
            payload = {
              kind: "linked_parent",
              parentEmail: parentEmailNormalized,
              studentName: name,
            };
          } else {
            const tempPassword = generateTempPassword(12);
            const parentHash = await bcrypt.hash(tempPassword, 12);
            const parentUser = await tx.user.create({
              data: {
                email: parentEmailNormalized,
                name: `Parent de ${firstName}`,
                password: parentHash,
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
            await tx.studentProfile.update({
              where: { id: studentProfile.id },
              data: { parentId: parentUser.parentProfile.id },
            });
            payload = {
              kind: "new_parent",
              parentEmail: parentEmailNormalized,
              tempPassword,
              studentName: name,
            };
          }
        }
      }

      if (role === "PARENT") {
        await tx.parentProfile.create({
          data: { userId: user.id },
        });
      }

      return payload;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "PARENT_EMAIL_INVALID") {
      return {
        ok: false,
        message: "L’email parent ne peut pas être utilisé.",
        fieldErrors: { parentEmail: ["Conflit de compte avec cet email."] },
      };
    }
    console.error("[register]", e);
    return { ok: false, message: "Impossible de créer le compte pour le moment." };
  }

  let parentEmailNotice: string | undefined;

  if (afterStudent) {
    if (afterStudent.kind === "new_parent") {
      const sent = await sendParentNewAccountEmail({
        to: afterStudent.parentEmail,
        studentName: afterStudent.studentName,
        temporaryPassword: afterStudent.tempPassword,
      });
      if (sent.ok) {
        parentEmailNotice = `Un email a été envoyé à ${afterStudent.parentEmail} avec les identifiants du compte parent.`;
      } else {
        parentEmailNotice = `Compte parent créé pour ${afterStudent.parentEmail}, mais l’email n’a pas pu être envoyé (${sent.reason}). Contacte le support ou configure RESEND_API_KEY et RESEND_FROM_EMAIL.`;
        if (process.env.NODE_ENV === "development") {
          console.warn("[register] Mot de passe parent provisoire (dev uniquement) :", afterStudent.tempPassword);
        }
      }
    } else {
      const sent = await sendParentChildLinkedEmail({
        to: afterStudent.parentEmail,
        studentName: afterStudent.studentName,
      });
      if (sent.ok) {
        parentEmailNotice = `Le parent (${afterStudent.parentEmail}) a reçu un email de confirmation.`;
      } else {
        parentEmailNotice = `Le parent a été relié à ton compte ; l’email de notification n’a pas pu être envoyé (${sent.reason}).`;
      }
    }
  }

  return {
    ok: true,
    redirect: role === "STUDENT" ? "/onboarding" : "/parent/dashboard",
    email,
    parentEmailNotice,
  };
}
