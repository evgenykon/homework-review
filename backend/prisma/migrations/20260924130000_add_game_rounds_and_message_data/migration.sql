-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "data" TEXT;

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "max_attempts" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "game_attempts" ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 1;
