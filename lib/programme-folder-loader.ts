import fs from "node:fs";
import path from "node:path";
import type { Niveau } from "@prisma/client";

/** Dossiers sous `content/programmes/` (minuscules, sans accent). */
export const NIVEAU_TO_PROGRAMME_DIR: Record<Niveau, string> = {
  SIXIEME: "sixieme",
  CINQUIEME: "cinquieme",
  QUATRIEME: "quatrieme",
  TROISIEME: "troisieme",
  SECONDE: "seconde",
  PREMIERE_GENERALE: "premiere_generale",
  PREMIERE_TECHNOLOGIQUE: "premiere_technologique",
  TERMINALE: "terminale",
  BTS: "bts",
};

const MAIN_NAMES = ["main.txt", "MAIN.txt"];

/** Lignes reconnues comme interdits / réserves pour l’IA (dans n’importe quel .txt). */
const RESTRICTION_LINE =
  /^\s*(?:\[RESTRICTION\s+IA\]|#+\s*RESTRICTION|<<<IA\s*:\s*INTERDIT>>>)\s*:?\s*(.+)$/i;

export type ProgrammeFileChunk = {
  /** Chemin relatif au dossier du niveau, ex. `01 - corpus - ....txt` */
  relPath: string;
  body: string;
};

export type LoadedProgrammeFolder = {
  niveau: Niveau;
  dirName: string;
  main: string;
  corpus: ProgrammeFileChunk[];
  modules: ProgrammeFileChunk[];
  other: ProgrammeFileChunk[];
  /** Phrases extraites des fichiers (obligatoires pour le modèle). */
  restrictions: string[];
  truncated: boolean;
};

function readUtf8(abs: string): string {
  return fs.readFileSync(abs, "utf8").replace(/^\uFEFF/, "");
}

function listTxtFilesRecursive(dir: string, base: string): { rel: string; abs: string }[] {
  if (!fs.existsSync(dir)) return [];
  const out: { rel: string; abs: string }[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...listTxtFilesRecursive(abs, base));
    } else if (ent.isFile() && /\.txt$/i.test(ent.name)) {
      out.push({ rel: path.relative(base, abs).replace(/\\/g, "/"), abs });
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel, "fr"));
}

function classifyRelPath(rel: string): "corpus" | "module" | "main" | "other" {
  const lower = rel.toLowerCase();
  const base = path.basename(lower);
  if (MAIN_NAMES.some((m) => base === m.toLowerCase())) return "main";
  if (lower.includes("corpus")) return "corpus";
  if (lower.includes("module")) return "module";
  return "other";
}

function extractRestrictions(text: string): string[] {
  const found: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = RESTRICTION_LINE.exec(line);
    if (m?.[1]) found.push(m[1].trim());
  }
  return found;
}

const MAX_MAIN = 18_000;
const MAX_PER_FILE = 12_000;
const MAX_TOTAL_FOLDER = 52_000;

/**
 * Charge `content/programmes/{sixieme|cinquieme|…}/` si `main.txt` existe.
 * Tous les autres `.txt` du dossier (récursif) sont classés en corpus / module / autre via le nom du fichier.
 */
export function loadProgrammeFolderForNiveau(niveau: Niveau, repoRoot: string): LoadedProgrammeFolder | null {
  const dirName = NIVEAU_TO_PROGRAMME_DIR[niveau];
  const baseDir = path.join(repoRoot, "content", "programmes", dirName);
  if (!fs.existsSync(baseDir)) return null;

  let mainPath: string | null = null;
  for (const name of MAIN_NAMES) {
    const p = path.join(baseDir, name);
    if (fs.existsSync(p)) {
      mainPath = p;
      break;
    }
  }
  if (!mainPath) return null;

  const mainRaw = readUtf8(mainPath);
  const main = mainRaw.length > MAX_MAIN ? `${mainRaw.slice(0, MAX_MAIN)}\n\n[…main.txt tronqué]` : mainRaw;

  const allTxt = listTxtFilesRecursive(baseDir, baseDir).filter((f) => classifyRelPath(f.rel) !== "main");

  const corpus: ProgrammeFileChunk[] = [];
  const modules: ProgrammeFileChunk[] = [];
  const other: ProgrammeFileChunk[] = [];
  const restrictions: string[] = [...extractRestrictions(mainRaw)];

  let total = main.length;
  let truncated = mainRaw.length > MAX_MAIN;

  for (const { rel, abs } of allTxt) {
    let body = readUtf8(abs);
    restrictions.push(...extractRestrictions(body));
    const kind = classifyRelPath(rel);
    if (body.length > MAX_PER_FILE) {
      body = `${body.slice(0, MAX_PER_FILE)}\n\n[…tronqué]`;
      truncated = true;
    }
    if (total + body.length > MAX_TOTAL_FOLDER) {
      truncated = true;
      break;
    }
    total += body.length;
    const chunk = { relPath: rel, body };
    if (kind === "corpus") corpus.push(chunk);
    else if (kind === "module") modules.push(chunk);
    else other.push(chunk);
  }

  const uniqRestrictions = Array.from(new Set(restrictions.filter(Boolean)));

  return {
    niveau,
    dirName,
    main,
    corpus,
    modules,
    other,
    restrictions: uniqRestrictions,
    truncated,
  };
}

/** Texte unique injecté dans le prompt système. */
export function formatLoadedFolderForPrompt(loaded: LoadedProgrammeFolder): string {
  const parts: string[] = [];

  parts.push("### Fichier principal (`main.txt`)\n", loaded.main.trim());

  const pushSection = (title: string, chunks: ProgrammeFileChunk[]) => {
    if (chunks.length === 0) return;
    parts.push(`\n### ${title}\n`);
    for (const c of chunks) {
      parts.push(`\n#### ${c.relPath}\n`, c.body.trim(), "\n");
    }
  };

  pushSection("Corpus (textes & propositions de matière — tu t’en inspires pour tes exercices)", loaded.corpus);
  pushSection("Modules (compétences / ateliers — tu t’en inspires pour tes exercices)", loaded.modules);
  if (loaded.other.length > 0) {
    pushSection("Autres ressources du niveau", loaded.other);
  }

  if (loaded.restrictions.length > 0) {
    parts.push(
      "\n### Restrictions explicites (obligatoires)\n",
      "Si une ligne ci-dessous limite ton champ d’action, **tu t’y plies**. Hors de ces lignes, tu as **carte blanche** pour inventer des exercices.\n\n",
      loaded.restrictions.map((r) => `- ${r}`).join("\n"),
      "\n",
    );
  } else {
    parts.push(
      "\n### Restrictions\n",
      "Aucune restriction balisée dans les fichiers. Tu as **carte blanche** pour proposer des exercices alignés sur le programme et les corpus / modules.\n",
    );
  }

  if (loaded.truncated) {
    parts.push(
      "\n_Note : une partie du contenu a été tronquée pour tenir dans la fenêtre de contexte. Priorise `main.txt` et varie les fichiers utilisés d’une session à l’autre si besoin._\n",
    );
  }

  return parts.join("").trim();
}
