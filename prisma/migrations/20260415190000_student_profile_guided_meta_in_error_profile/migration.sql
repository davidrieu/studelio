-- Ancrage du flag « bootstrap META historique » dans errorProfile.__studelio
-- pour ne pas dépendre d'une colonne absente si migrate deploy n'a pas tourné en prod.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'StudentProfile'
      AND column_name = 'guidedMetaReplayedAt'
  ) THEN
    UPDATE "StudentProfile"
    SET "errorProfile" = jsonb_set(
      COALESCE("errorProfile"::jsonb, '{}'::jsonb),
      '{__studelio,guidedMetaReplayed}'::text[],
      'true'::jsonb,
      true
    )
    WHERE "guidedMetaReplayedAt" IS NOT NULL;

    ALTER TABLE "StudentProfile" DROP COLUMN "guidedMetaReplayedAt";
  END IF;
END $$;
