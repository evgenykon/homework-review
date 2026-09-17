-- CreateTable
CREATE TABLE "room_pages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strokes" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strokes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_pages_session_id_idx" ON "room_pages"("session_id");

-- CreateIndex
CREATE INDEX "strokes_page_id_idx" ON "strokes"("page_id");

-- AddForeignKey
ALTER TABLE "room_pages" ADD CONSTRAINT "room_pages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strokes" ADD CONSTRAINT "strokes_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "room_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
