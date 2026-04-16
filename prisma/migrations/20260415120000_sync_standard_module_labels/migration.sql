-- Libellés modules Studelio unifiés (tous programmes, ordres 1–6).
-- Objectifs vides : la phrase de description suffit à l’affichage.

UPDATE "ProgrammeChapter" SET
  "title" = 'Module 1 - Grammaire',
  "description" = 'Maîtriser la structure de la phrase, la nature et les fonctions des mots.',
  "objectives" = ARRAY[]::TEXT[],
  "skills" = ARRAY['Grammaire']::TEXT[],
  "systemPrompt" = NULL
WHERE "order" = 1;

UPDATE "ProgrammeChapter" SET
  "title" = 'Module 2 - Orthographe',
  "description" = 'Bien écrire : l''orthographe courante, les règles d''accord et les homophones.',
  "objectives" = ARRAY[]::TEXT[],
  "skills" = ARRAY['Orthographe']::TEXT[],
  "systemPrompt" = NULL
WHERE "order" = 2;

UPDATE "ProgrammeChapter" SET
  "title" = 'Module 3 - Conjugaison',
  "description" = 'Maîtriser les temps et les modes des verbes.',
  "objectives" = ARRAY[]::TEXT[],
  "skills" = ARRAY['Conjugaison']::TEXT[],
  "systemPrompt" = NULL
WHERE "order" = 3;

UPDATE "ProgrammeChapter" SET
  "title" = 'Module 4 - Lecture',
  "description" = 'Bien lire : Comprendre un texte et repérer l''essentiel.',
  "objectives" = ARRAY[]::TEXT[],
  "skills" = ARRAY['Lecture']::TEXT[],
  "systemPrompt" = NULL
WHERE "order" = 4;

UPDATE "ProgrammeChapter" SET
  "title" = 'Module 5 - Expression écrite',
  "description" = 'Bien argumenter et rédiger un texte cohérent.',
  "objectives" = ARRAY[]::TEXT[],
  "skills" = ARRAY['Expression écrite']::TEXT[],
  "systemPrompt" = NULL
WHERE "order" = 5;

UPDATE "ProgrammeChapter" SET
  "title" = 'Module 6 - Vocabulaire',
  "description" = 'Enrichir son vocabulaire pour comprendre et s''exprimer.',
  "objectives" = ARRAY[]::TEXT[],
  "skills" = ARRAY['Vocabulaire']::TEXT[],
  "systemPrompt" = NULL
WHERE "order" = 6;

-- Parcours plus courts (ex. 5e à 5 lignes, BTS à 4) : compléter les modules 5 et/ou 6.
INSERT INTO "ProgrammeChapter" ("id", "programmeId", "title", "description", "order", "objectives", "skills", "systemPrompt")
SELECT
  replace((gen_random_uuid())::text, '-', ''),
  p."id",
  'Module 5 - Expression écrite',
  'Bien argumenter et rédiger un texte cohérent.',
  5,
  ARRAY[]::TEXT[],
  ARRAY['Expression écrite']::TEXT[],
  NULL
FROM "Programme" p
WHERE EXISTS (SELECT 1 FROM "ProgrammeChapter" c0 WHERE c0."programmeId" = p."id")
  AND NOT EXISTS (
  SELECT 1 FROM "ProgrammeChapter" c WHERE c."programmeId" = p."id" AND c."order" = 5
);

INSERT INTO "ProgrammeChapter" ("id", "programmeId", "title", "description", "order", "objectives", "skills", "systemPrompt")
SELECT
  replace((gen_random_uuid())::text, '-', ''),
  p."id",
  'Module 6 - Vocabulaire',
  'Enrichir son vocabulaire pour comprendre et s''exprimer.',
  6,
  ARRAY[]::TEXT[],
  ARRAY['Vocabulaire']::TEXT[],
  NULL
FROM "Programme" p
WHERE EXISTS (SELECT 1 FROM "ProgrammeChapter" c0 WHERE c0."programmeId" = p."id")
  AND NOT EXISTS (
  SELECT 1 FROM "ProgrammeChapter" c WHERE c."programmeId" = p."id" AND c."order" = 6
);
