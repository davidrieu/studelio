import { PrismaClient } from "@prisma/client";
import { formatLoadedFolderForPrompt, loadProgrammeFolderForNiveau } from "../lib/programme-folder-loader";
import { programmeSeeds } from "./data/programmes";
import { loadProgrammeMarkdownFromDisk } from "./load-content-programme";

const prisma = new PrismaClient();

/** Racine du repo (les scripts npm s’exécutent depuis le dossier projet). */
const repoRoot = process.cwd();

/** Mot de passe en clair : studelio-local — uniquement pour le dev local (seed). */
const DEMO_PASSWORD_HASH =
  "$2b$12$wMesmYAE8x2KpSMUTpoC3.HP2N4BM.ooIN3pXPAdjwcFSFYYfIt6K";

async function seedDemoUser() {
  const email = "demo@studelio.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const programme = await prisma.programme.findUnique({ where: { niveau: "SIXIEME" } });

  await prisma.user.create({
    data: {
      email,
      name: "Élève démo",
      password: DEMO_PASSWORD_HASH,
      role: "STUDENT",
      subscription: {
        create: {
          stripeCustomerId: "pending_demo_local",
          status: "INCOMPLETE",
          plan: "ESSENTIEL",
        },
      },
      studentProfile: {
        create: {
          niveau: "SIXIEME",
          interests: [],
          tags: [],
          ...(programme?.id ? { programmeId: programme.id } : {}),
        },
      },
    },
  });

  console.log("");
  console.log("Compte démo (connexion directe) :");
  console.log("  Email    : demo@studelio.local");
  console.log("  Mot de passe : studelio-local");
  console.log("");
}

async function main() {
  for (const p of programmeSeeds) {
    const folder = loadProgrammeFolderForNiveau(p.niveau, repoRoot);
    const briefFromFolder = folder ? formatLoadedFolderForPrompt(folder) : null;
    const fromFile = loadProgrammeMarkdownFromDisk(p.niveau, repoRoot);
    const title = fromFile?.title ?? p.title;
    const description = fromFile?.description ?? p.description;

    const programme = await prisma.programme.upsert({
      where: { niveau: p.niveau },
      create: {
        niveau: p.niveau,
        title,
        description,
        aiBrief:
          briefFromFolder ?? (fromFile?.aiBrief?.trim() ? fromFile.aiBrief : null),
      },
      update: {
        title,
        description,
        ...(briefFromFolder
          ? { aiBrief: briefFromFolder }
          : fromFile?.aiBrief !== undefined
            ? { aiBrief: fromFile.aiBrief.trim() ? fromFile.aiBrief : null }
            : {}),
      },
    });

    await prisma.programmeChapter.deleteMany({
      where: { programmeId: programme.id },
    });

    await prisma.programmeChapter.createMany({
      data: p.chapters.map((c) => ({
        programmeId: programme.id,
        order: c.order,
        title: c.title,
        description: c.description ?? null,
        objectives: c.objectives,
        skills: c.skills,
        systemPrompt: c.systemPrompt ?? null,
      })),
    });
  }

  await seedDemoUser();

  console.log(`Seed OK — ${programmeSeeds.length} programmes.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
