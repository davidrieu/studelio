-- Remplace PREMIERE par PREMIERE_GENERALE + PREMIERE_TECHNOLOGIQUE (données existantes → générale).

ALTER TABLE "StudentProfile" ALTER COLUMN "niveau" SET DATA TYPE text USING ("niveau"::text);
ALTER TABLE "Programme" ALTER COLUMN "niveau" SET DATA TYPE text USING ("niveau"::text);
ALTER TABLE "ChatSession" ALTER COLUMN "niveau" SET DATA TYPE text USING ("niveau"::text);
ALTER TABLE "BacBlanc" ALTER COLUMN "niveau" SET DATA TYPE text USING ("niveau"::text);

UPDATE "StudentProfile" SET "niveau" = 'PREMIERE_GENERALE' WHERE "niveau" = 'PREMIERE';
UPDATE "Programme" SET "niveau" = 'PREMIERE_GENERALE' WHERE "niveau" = 'PREMIERE';
UPDATE "ChatSession" SET "niveau" = 'PREMIERE_GENERALE' WHERE "niveau" = 'PREMIERE';
UPDATE "BacBlanc" SET "niveau" = 'PREMIERE_GENERALE' WHERE "niveau" = 'PREMIERE';

DROP TYPE "Niveau";

CREATE TYPE "Niveau" AS ENUM (
  'SIXIEME',
  'CINQUIEME',
  'QUATRIEME',
  'TROISIEME',
  'SECONDE',
  'PREMIERE_GENERALE',
  'PREMIERE_TECHNOLOGIQUE',
  'TERMINALE',
  'BTS'
);

ALTER TABLE "StudentProfile" ALTER COLUMN "niveau" SET DATA TYPE "Niveau" USING ("niveau"::"Niveau");
ALTER TABLE "Programme" ALTER COLUMN "niveau" SET DATA TYPE "Niveau" USING ("niveau"::"Niveau");
ALTER TABLE "ChatSession" ALTER COLUMN "niveau" SET DATA TYPE "Niveau" USING ("niveau"::"Niveau");
ALTER TABLE "BacBlanc" ALTER COLUMN "niveau" SET DATA TYPE "Niveau" USING ("niveau"::"Niveau");

-- Programme 1re techno (même squelette de modules que la générale) si absent
INSERT INTO "Programme" ("id", "niveau", "title", "description", "aiBrief", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  'PREMIERE_TECHNOLOGIQUE'::"Niveau",
  'Français — 1re technologique',
  'Français — série technologique (même structure de modules que la 1re générale au déploiement ; adapte le contenu si besoin).',
  p."aiBrief",
  now()
FROM "Programme" p
WHERE p."niveau" = 'PREMIERE_GENERALE'::"Niveau"
  AND NOT EXISTS (SELECT 1 FROM "Programme" t WHERE t."niveau" = 'PREMIERE_TECHNOLOGIQUE'::"Niveau");

INSERT INTO "ProgrammeChapter" ("id", "programmeId", "title", "description", "order", "objectives", "skills", "systemPrompt")
SELECT
  md5(random()::text || c."id" || clock_timestamp()::text),
  (SELECT t."id" FROM "Programme" t WHERE t."niveau" = 'PREMIERE_TECHNOLOGIQUE'::"Niveau" LIMIT 1),
  c."title",
  c."description",
  c."order",
  c."objectives",
  c."skills",
  c."systemPrompt"
FROM "ProgrammeChapter" c
JOIN "Programme" g ON g."id" = c."programmeId" AND g."niveau" = 'PREMIERE_GENERALE'::"Niveau"
WHERE EXISTS (SELECT 1 FROM "Programme" t WHERE t."niveau" = 'PREMIERE_TECHNOLOGIQUE'::"Niveau")
  AND NOT EXISTS (
    SELECT 1
    FROM "ProgrammeChapter" c2
    WHERE c2."programmeId" = (SELECT t2."id" FROM "Programme" t2 WHERE t2."niveau" = 'PREMIERE_TECHNOLOGIQUE'::"Niveau" LIMIT 1)
  );
