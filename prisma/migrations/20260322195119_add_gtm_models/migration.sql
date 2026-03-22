-- CreateTable
CREATE TABLE "GtmPlan" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "planJson" JSONB,
    "editedJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GtmPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GtmAsset" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GtmAsset_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GtmPlan" ADD CONSTRAINT "GtmPlan_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtmPlan" ADD CONSTRAINT "GtmPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtmAsset" ADD CONSTRAINT "GtmAsset_planId_fkey" FOREIGN KEY ("planId") REFERENCES "GtmPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
