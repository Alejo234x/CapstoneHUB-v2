-- CreateTable
CREATE TABLE "project_attachment" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "uploaded_by_user_id" INTEGER,
    "original_name" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "mime_type" VARCHAR(127) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uk_project_attachment_storage_key" ON "project_attachment"("storage_key");

-- CreateIndex
CREATE INDEX "idx_project_attachment_project_id" ON "project_attachment"("project_id");

-- CreateIndex
CREATE INDEX "idx_project_attachment_uploaded_by_user_id" ON "project_attachment"("uploaded_by_user_id");

-- CreateIndex
CREATE INDEX "idx_project_attachment_created_at" ON "project_attachment"("created_at");

-- AddForeignKey
ALTER TABLE "project_attachment" ADD CONSTRAINT "project_attachment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_attachment" ADD CONSTRAINT "project_attachment_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
