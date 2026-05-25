-- CreateTable
CREATE TABLE "SKU" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputSchema" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SKUWorkflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skuId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SKUWorkflow_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SKUWorkflow_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RevokedToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jti" TEXT NOT NULL,
    "revokedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SKU_code_key" ON "SKU"("code");

-- CreateIndex
CREATE INDEX "SKU_code_idx" ON "SKU"("code");

-- CreateIndex
CREATE INDEX "SKUWorkflow_skuId_idx" ON "SKUWorkflow"("skuId");

-- CreateIndex
CREATE INDEX "SKUWorkflow_workflowId_idx" ON "SKUWorkflow"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "SKUWorkflow_skuId_workflowId_key" ON "SKUWorkflow"("skuId", "workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "RevokedToken_jti_key" ON "RevokedToken"("jti");

-- CreateIndex
CREATE INDEX "RevokedToken_jti_idx" ON "RevokedToken"("jti");
