-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FOUNDER', 'ADMIN', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('TIME', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "PayoutType" AS ENUM ('HOURLY', 'PROFIT');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'EXECUTED', 'DEFERRED_TO_EQUITY', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'FOUNDER',
    "hourly_rate" DECIMAL(12,2),
    "wallet_info" TEXT,
    "bank_info" TEXT,
    "two_factor_secret" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "invited_by" TEXT,
    "invited_at" TIMESTAMP(3),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "budget" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" "ContributionType" NOT NULL,
    "hours" DECIMAL(10,2),
    "amount" DECIMAL(14,2),
    "other_points" DECIMAL(14,2),
    "points" DECIMAL(14,2),
    "date" DATE NOT NULL,
    "notes" TEXT,
    "attachment_url" TEXT,
    "defer_to_equity" BOOLEAN NOT NULL DEFAULT false,
    "conversion_rate" DECIMAL(10,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "EquityAllocation" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "points" DECIMAL(14,2) NOT NULL,
    "total_points" DECIMAL(14,2) NOT NULL,
    "shares_allocated" DECIMAL(10,4) NOT NULL,
    "vesting_start" DATE NOT NULL,
    "cliff_months" INTEGER NOT NULL,
    "vesting_months" INTEGER NOT NULL,
    "project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquityAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "PayoutType" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "period_start" DATE,
    "period_end" DATE,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitPool" (
    "id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "allocated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfitPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entity_id" TEXT,
    "payload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Contribution_user_id_idx" ON "Contribution"("user_id");

-- CreateIndex
CREATE INDEX "Contribution_project_id_idx" ON "Contribution"("project_id");

-- CreateIndex
CREATE INDEX "Contribution_date_idx" ON "Contribution"("date");

-- CreateIndex
CREATE INDEX "WeightsConfig_project_id_idx" ON "WeightsConfig"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "WeightsConfig_scope_project_id_key" ON "WeightsConfig"("scope", "project_id");

-- CreateIndex
CREATE INDEX "EquityAllocation_user_id_idx" ON "EquityAllocation"("user_id");

-- CreateIndex
CREATE INDEX "EquityAllocation_project_id_idx" ON "EquityAllocation"("project_id");

-- CreateIndex
CREATE INDEX "Payout_user_id_idx" ON "Payout"("user_id");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_date_idx" ON "Payout"("date");

-- CreateIndex
CREATE INDEX "AuditLog_user_id_idx" ON "AuditLog"("user_id");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquityAllocation" ADD CONSTRAINT "EquityAllocation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
