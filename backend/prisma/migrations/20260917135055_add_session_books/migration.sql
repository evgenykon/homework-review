-- CreateTable
CREATE TABLE "session_books" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_books_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_books_session_id_idx" ON "session_books"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_books_session_id_book_id_key" ON "session_books"("session_id", "book_id");

-- AddForeignKey
ALTER TABLE "session_books" ADD CONSTRAINT "session_books_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_books" ADD CONSTRAINT "session_books_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
