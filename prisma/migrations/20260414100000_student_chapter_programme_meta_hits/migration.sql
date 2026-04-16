-- Compteur de META séance programme ayant ciblé ce module (automatisation progression)
ALTER TABLE "StudentChapterProgress" ADD COLUMN "programmeMetaHits" INTEGER NOT NULL DEFAULT 0;
