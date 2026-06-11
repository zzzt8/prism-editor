-- CreateTable
CREATE TABLE "ProductTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publishedId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductTemplate_publishedId_fkey" FOREIGN KEY ("publishedId") REFERENCES "PublishedWorkflow" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductTemplate_publishedId_key" ON "ProductTemplate"("publishedId");

-- CreateIndex
CREATE INDEX "ProductTemplate_userId_idx" ON "ProductTemplate"("userId");
