/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Bet` table. All the data in the column will be lost.
  - You are about to drop the column `payout` on the `Bet` table. All the data in the column will be lost.
  - You are about to drop the column `targets` on the `Bet` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Bet` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Bet` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - The `status` column on the `Bet` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - The `status` column on the `Transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `status` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `balance` on the `User` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to drop the `DepositRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Round` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WithdrawRequest` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `betType` to the `Bet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `balanceAfter` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `balanceBefore` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "BetType" AS ENUM ('SINGLE', 'PAIR', 'TRIPLE', 'QUAD');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('ACTIVE', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'ACTIVE', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OpeningType" AS ENUM ('SINGLE', 'PAIR', 'TRIPLE', 'QUAD');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'BET_PLACED', 'BET_WON', 'BET_LOST', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "DepositRequest" DROP CONSTRAINT "DepositRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "WithdrawRequest" DROP CONSTRAINT "WithdrawRequest_userId_fkey";

-- AlterTable
ALTER TABLE "Bet" DROP COLUMN "createdAt",
DROP COLUMN "payout",
DROP COLUMN "targets",
DROP COLUMN "type",
ADD COLUMN     "betType" "BetType" NOT NULL,
ADD COLUMN     "numbers" INTEGER[],
ADD COLUMN     "payoutMultiplier" INTEGER,
ADD COLUMN     "settlementAmount" DECIMAL(18,2),
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,2),
DROP COLUMN "status",
ADD COLUMN     "status" "BetStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "adminRemark" TEXT,
ADD COLUMN     "balanceAfter" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "balanceBefore" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "settledAt" TIMESTAMP(3),
DROP COLUMN "type",
ADD COLUMN     "type" "TransactionType" NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,2),
DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "status",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
ADD COLUMN     "totalBets" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalDeposit" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalWithdraw" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalWon" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "username" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "balance" SET DEFAULT 0,
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(18,2);

-- DropTable
DROP TABLE "DepositRequest";

-- DropTable
DROP TABLE "Round";

-- DropTable
DROP TABLE "WithdrawRequest";

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "openingResult" INTEGER[],
    "openingType" "OpeningType" NOT NULL,
    "totalStake" DECIMAL(18,2) NOT NULL,
    "totalPayout" DECIMAL(18,2) NOT NULL,
    "houseProfit" DECIMAL(18,2) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" "RoundStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetStats" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roundId" TEXT,
    "singlesData" JSONB NOT NULL,
    "pairsData" JSONB NOT NULL,
    "triplesData" JSONB NOT NULL,
    "quadsData" JSONB NOT NULL,
    "totalStake" DECIMAL(18,2) NOT NULL,
    "totalBets" INTEGER NOT NULL,
    "uniqueUsers" INTEGER NOT NULL,
    "calculationTimeMs" INTEGER NOT NULL,

    CONSTRAINT "BetStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningHistory" (
    "id" TEXT NOT NULL,
    "opening" INTEGER[],
    "openingType" "OpeningType" NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profit" DECIMAL(18,2) NOT NULL,
    "totalStake" DECIMAL(18,2) NOT NULL,
    "roundId" TEXT NOT NULL,

    CONSTRAINT "OpeningHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL DEFAULT 'default-settings',
    "roundDuration" INTEGER NOT NULL DEFAULT 60,
    "minBetAmount" DECIMAL(18,2) NOT NULL DEFAULT 10,
    "maxBetAmount" DECIMAL(18,2) NOT NULL DEFAULT 100000,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfscCode" TEXT,
    "upiId" TEXT,
    "qrCodeUrl" TEXT,
    "paymentInstructions" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_token_idx" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_roundNumber_key" ON "GameRound"("roundNumber");

-- CreateIndex
CREATE INDEX "GameRound_roundNumber_idx" ON "GameRound"("roundNumber");

-- CreateIndex
CREATE INDEX "GameRound_status_idx" ON "GameRound"("status");

-- CreateIndex
CREATE INDEX "GameRound_startedAt_idx" ON "GameRound"("startedAt");

-- CreateIndex
CREATE INDEX "BetStats_timestamp_idx" ON "BetStats"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "BetStats_roundId_idx" ON "BetStats"("roundId");

-- CreateIndex
CREATE INDEX "OpeningHistory_timestamp_idx" ON "OpeningHistory"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "OpeningHistory_roundId_idx" ON "OpeningHistory"("roundId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_targetId_idx" ON "AuditLog"("targetId");

-- CreateIndex
CREATE INDEX "Bet_userId_timestamp_idx" ON "Bet"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Bet_roundId_status_idx" ON "Bet"("roundId", "status");

-- CreateIndex
CREATE INDEX "Bet_betType_timestamp_idx" ON "Bet"("betType", "timestamp");

-- CreateIndex
CREATE INDEX "Bet_status_timestamp_idx" ON "Bet"("status", "timestamp");

-- CreateIndex
CREATE INDEX "Bet_timestamp_idx" ON "Bet"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_reference_idx" ON "Transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_mobile_idx" ON "User"("mobile");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
