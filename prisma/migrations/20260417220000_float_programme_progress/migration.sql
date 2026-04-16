-- Radar et barres modules : décimales pour micro-points (0.1 … 1) sur plusieurs mois.
ALTER TABLE "StudentCompetencyProgress"
  ALTER COLUMN "grammaire" TYPE DOUBLE PRECISION USING "grammaire"::double precision,
  ALTER COLUMN "orthographe" TYPE DOUBLE PRECISION USING "orthographe"::double precision,
  ALTER COLUMN "conjugaison" TYPE DOUBLE PRECISION USING "conjugaison"::double precision,
  ALTER COLUMN "vocabulaire" TYPE DOUBLE PRECISION USING "vocabulaire"::double precision,
  ALTER COLUMN "expressionEcrite" TYPE DOUBLE PRECISION USING "expressionEcrite"::double precision,
  ALTER COLUMN "lecture" TYPE DOUBLE PRECISION USING "lecture"::double precision;

ALTER TABLE "StudentChapterProgress"
  ALTER COLUMN "programmeMetaHits" TYPE DOUBLE PRECISION USING "programmeMetaHits"::double precision;
