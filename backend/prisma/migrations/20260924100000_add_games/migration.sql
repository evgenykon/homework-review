-- CreateEnum
CREATE TYPE "GameAttemptStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'CHECKED');

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_words" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "game_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_attempts" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "task_type" INTEGER NOT NULL,
    "status" "GameAttemptStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_answers" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "game_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "games_session_id_idx" ON "games"("session_id");

-- CreateIndex
CREATE INDEX "game_words_game_id_idx" ON "game_words"("game_id");

-- CreateIndex
CREATE INDEX "game_attempts_game_id_idx" ON "game_attempts"("game_id");

-- CreateIndex
CREATE INDEX "game_answers_attempt_id_idx" ON "game_answers"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_answers_attempt_id_word_id_key" ON "game_answers"("attempt_id", "word_id");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_words" ADD CONSTRAINT "game_words_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_attempts" ADD CONSTRAINT "game_attempts_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_answers" ADD CONSTRAINT "game_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "game_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_answers" ADD CONSTRAINT "game_answers_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "game_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
