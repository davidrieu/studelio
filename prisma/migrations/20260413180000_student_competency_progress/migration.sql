-- CreateTable
CREATE TABLE "StudentCompetencyProgress" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "grammaire" INTEGER NOT NULL DEFAULT 0,
    "orthographe" INTEGER NOT NULL DEFAULT 0,
    "conjugaison" INTEGER NOT NULL DEFAULT 0,
    "vocabulaire" INTEGER NOT NULL DEFAULT 0,
    "expressionEcrite" INTEGER NOT NULL DEFAULT 0,
    "lecture" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCompetencyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentCompetencyProgress_studentProfileId_key" ON "StudentCompetencyProgress"("studentProfileId");

-- AddForeignKey
ALTER TABLE "StudentCompetencyProgress" ADD CONSTRAINT "StudentCompetencyProgress_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
