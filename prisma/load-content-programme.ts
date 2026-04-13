import fs from "node:fs";
import path from "node:path";
import type { Niveau } from "@prisma/client";

export type ParsedProgrammeFile = {
  aiBrief: string;
  title?: string;
  description?: string;
};

/**
 * Lit `content/programmes/{NIVEAU}.md` à la racine du dépôt.
 * Frontmatter YAML minimal (lignes `clé: valeur`) optionnel entre --- ... ---.
 */
export function loadProgrammeMarkdownFromDisk(
  niveau: Niveau,
  repoRoot: string,
): ParsedProgrammeFile | null {
  const filePath = path.join(repoRoot, "content", "programmes", `${niveau}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return parseProgrammeMarkdown(raw);
}

export function parseProgrammeMarkdown(raw: string): ParsedProgrammeFile {
  const trimmed = raw.replace(/^\uFEFF/, "").trimStart();
  if (!trimmed.startsWith("---")) {
    return { aiBrief: trimmed.trim() };
  }
  const close = trimmed.indexOf("\n---", 3);
  if (close === -1) {
    return { aiBrief: trimmed.trim() };
  }
  const front = trimmed.slice(3, close).trim();
  const body = trimmed.slice(close + 4).trim();
  const meta: Record<string, string> = {};
  for (const line of front.split("\n")) {
    const m = /^([\w-]+):\s*(.*)$/.exec(line);
    if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return {
    aiBrief: body,
    ...(meta.title ? { title: meta.title } : {}),
    ...(meta.description ? { description: meta.description } : {}),
  };
}
