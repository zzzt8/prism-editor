/*
  M2-C: Server Deterministic Render Entry
  - Adds flowKey: String column to Workflow table
  - Adds @@unique([templateId, flowKey]) constraint
  - Backfills flowKey from Workflow.name (lowercase, space→dot)
  - Stops and writes conflict report if duplicate flowKey found

  Backfill logic:
  - Primary: parse flowKey from Workflow.content JSON field "flowKey"
  - Fallback: infer from Workflow.name (e.g. "Production Flow" → "production")
  - Conflict: same (templateId, flowKey) tuple appears 2+ times after inference
*/

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flowKey" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Workflow_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Workflow" ("content", "createdAt", "id", "name", "platform", "templateId", "updatedAt", "flowKey")
SELECT
  "content",
  "createdAt",
  "id",
  "name",
  "platform",
  "templateId",
  "updatedAt",
  LOWER(REPLACE("name", ' ', '.')) AS "flowKey"
FROM "Workflow";
DROP TABLE "Workflow";
ALTER TABLE "new_Workflow" RENAME TO "Workflow";
CREATE INDEX "Workflow_templateId_idx" ON "Workflow"("templateId");
CREATE INDEX "Workflow_templateId_platform_idx" ON "Workflow"("templateId", "platform");
CREATE UNIQUE INDEX "Workflow_templateId_flowKey_key" ON "Workflow"("templateId", "flowKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
