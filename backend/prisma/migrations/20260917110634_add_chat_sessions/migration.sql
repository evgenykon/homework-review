/*
  Warnings:

  - Added the required column `sender_id` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "sender_id" TEXT NOT NULL,
ADD COLUMN     "session_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_sessions_child_id_idx" ON "chat_sessions"("child_id");

-- CreateIndex
CREATE INDEX "chat_sessions_parent_id_idx" ON "chat_sessions"("parent_id");

-- CreateIndex
CREATE INDEX "messages_session_id_idx" ON "messages"("session_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
