-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PublishedWorkflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedBy" TEXT,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublishedWorkflow_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PublishedWorkflow" ("content", "id", "publishedAt", "publishedBy", "workflowId") SELECT "content", "id", "publishedAt", "publishedBy", "workflowId" FROM "PublishedWorkflow";
DROP TABLE "PublishedWorkflow";
ALTER TABLE "new_PublishedWorkflow" RENAME TO "PublishedWorkflow";
CREATE UNIQUE INDEX "PublishedWorkflow_workflowId_key" ON "PublishedWorkflow"("workflowId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
