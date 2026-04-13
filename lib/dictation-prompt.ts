/** Données exposées au LLM : titres + id court uniquement — jamais le corrigé. */
export function formatDictationsForGuidedPrompt(rows: { id: string; title: string }[]): string {
  if (rows.length === 0) {
    return "";
  }
  return rows.map((r) => `- **${r.title}** (réf. interne \`${r.id}\`)`).join("\n");
}
