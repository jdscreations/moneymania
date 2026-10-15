-- Bills, EMIs and reminders had no writers before this milestone, so these tables are empty
-- and the NOT NULL columns below need no backfill.

-- CreateEnum
CREATE TYPE "BillFrequency" AS ENUM ('weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'once');

-- DropIndex
DROP INDEX "reminders_remindOn_sentAt_idx";

-- AlterTable
ALTER TABLE "bills" DROP COLUMN "recurrence",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "dueDay" INTEGER NOT NULL,
ADD COLUMN     "frequency" "BillFrequency" NOT NULL,
ADD COLUMN     "lastPaidOn" DATE,
ADD COLUMN     "remindDaysBefore" INTEGER NOT NULL DEFAULT 3,
ALTER COLUMN "nextDueOn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "emis" DROP COLUMN "startOn",
ADD COLUMN     "firstDueOn" DATE NOT NULL,
ADD COLUMN     "gstOnInterestBps" INTEGER NOT NULL DEFAULT 1800,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "remindDaysBefore" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "reminders" DROP COLUMN "remindOn",
ADD COLUMN     "dueOn" DATE NOT NULL,
ALTER COLUMN "sentAt" SET NOT NULL,
ALTER COLUMN "sentAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_userId_idx" ON "push_tokens"("userId");

-- CreateIndex
CREATE INDEX "reminders_userId_idx" ON "reminders"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_subjectType_subjectId_dueOn_channel_key" ON "reminders"("subjectType", "subjectId", "dueOn", "channel");

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

