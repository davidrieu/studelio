-- CreateEnum
CREATE TYPE "ChatSessionKind" AS ENUM ('FREE', 'PROGRAMME_GUIDED');

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN "kind" "ChatSessionKind" NOT NULL DEFAULT 'FREE';
