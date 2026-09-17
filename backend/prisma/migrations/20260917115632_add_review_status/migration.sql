-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'APPROVED');

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING';
