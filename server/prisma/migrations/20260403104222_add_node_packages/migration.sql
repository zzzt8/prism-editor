-- CreateTable
CREATE TABLE "NodePackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "latestVersion" TEXT NOT NULL,
    "latestManifest" TEXT NOT NULL,
    "storageType" TEXT NOT NULL DEFAULT 'database',
    "ossKey" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NodePackage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NodePackageVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "manifest" TEXT NOT NULL,
    "storageType" TEXT NOT NULL DEFAULT 'database',
    "ossKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NodePackageVersion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "NodePackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NodePackage_name_key" ON "NodePackage"("name");

-- CreateIndex
CREATE INDEX "NodePackage_authorId_idx" ON "NodePackage"("authorId");

-- CreateIndex
CREATE INDEX "NodePackage_category_idx" ON "NodePackage"("category");

-- CreateIndex
CREATE INDEX "NodePackageVersion_packageId_idx" ON "NodePackageVersion"("packageId");
