-- Restore WeightsConfig table
CREATE TABLE "WeightsConfig" (
    "id" TEXT NOT NULL,
    "time_weight" DECIMAL(8,4) NOT NULL,
    "cash_weight" DECIMAL(8,4) NOT NULL,
    "other_weight" DECIMAL(8,4) NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'company',
    "project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeightsConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeightsConfig_scope_project_id_key" ON "WeightsConfig"("scope", "project_id");
CREATE INDEX "WeightsConfig_project_id_idx" ON "WeightsConfig"("project_id");

-- Restore points column on Contribution
ALTER TABLE "Contribution" ADD COLUMN "points" DECIMAL(14,2);
