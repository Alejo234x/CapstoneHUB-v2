-- CreateTable
CREATE TABLE "project_change_history" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "author_user_id" INTEGER,
    "field" VARCHAR(64) NOT NULL,
    "previous_value" TEXT,
    "new_value" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_change_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_project_change_history_project_id" ON "project_change_history"("project_id");

-- CreateIndex
CREATE INDEX "idx_project_change_history_changed_at" ON "project_change_history"("changed_at");

-- AddForeignKey
ALTER TABLE "project_change_history" ADD CONSTRAINT "project_change_history_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_change_history" ADD CONSTRAINT "project_change_history_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
