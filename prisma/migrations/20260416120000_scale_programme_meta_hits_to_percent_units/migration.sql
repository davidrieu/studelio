-- Ancien modèle : 1–4 « hits » pour remplir la barre. Nouveau : 0–100 (= % affiché jusqu’à terminé).
UPDATE "StudentChapterProgress"
SET "programmeMetaHits" = CASE
  WHEN "status" = 'COMPLETED' AND "programmeMetaHits" < 100 THEN 100
  WHEN "status" != 'COMPLETED' AND "programmeMetaHits" >= 1 AND "programmeMetaHits" <= 4 THEN LEAST(99, "programmeMetaHits" * 25)
  ELSE "programmeMetaHits"
END;
