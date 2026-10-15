-- CreateEnum
CREATE TYPE "MoneyAccountType" AS ENUM ('cash', 'bank', 'upi', 'credit_card', 'wallet');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('income', 'expense', 'transfer', 'refund');

-- CreateEnum
CREATE TYPE "IncomeSource" AS ENUM ('salary', 'freelance', 'gig', 'business', 'cash', 'interest', 'other');

-- CreateEnum
CREATE TYPE "EmiKind" AS ENUM ('card_merchant', 'card_conversion', 'loan', 'bnpl');

-- CreateEnum
CREATE TYPE "EmiStatus" AS ENUM ('active', 'foreclosed', 'cancelled', 'closed');

-- CreateEnum
CREATE TYPE "Merchant" AS ENUM ('amazon_in', 'flipkart', 'other');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('open', 'resolved');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('kept', 'cancelled', 'return_requested', 'returned');

-- CreateEnum
CREATE TYPE "CaseEventType" AS ENUM ('call', 'email', 'sr_number', 'promise', 'escalation', 'note');

-- CreateEnum
CREATE TYPE "ReminderSubject" AS ENUM ('bill', 'emi', 'purchase_case');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('push', 'email', 'in_app');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MoneyAccountType" NOT NULL,
    "name" TEXT NOT NULL,
    "bankCode" TEXT,
    "openingBalancePaise" BIGINT NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "money_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "CategoryKind" NOT NULL,
    "icon" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "kind" "TransactionKind" NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "occurredOn" DATE NOT NULL,
    "incomeSource" "IncomeSource",
    "note" TEXT,
    "tags" TEXT[],
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "limitPaise" BIGINT NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "accountId" TEXT,
    "recurrence" TEXT NOT NULL,
    "nextDueOn" DATE NOT NULL,
    "autopay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "kind" "EmiKind" NOT NULL,
    "lender" TEXT NOT NULL,
    "principalPaise" BIGINT NOT NULL,
    "annualRateBps" INTEGER NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "startOn" DATE NOT NULL,
    "processingFeePaise" BIGINT NOT NULL DEFAULT 0,
    "bankRuleId" TEXT,
    "status" "EmiStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emi_installments" (
    "id" TEXT NOT NULL,
    "emiId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "dueOn" DATE NOT NULL,
    "principalPaise" BIGINT NOT NULL,
    "interestPaise" BIGINT NOT NULL,
    "gstPaise" BIGINT NOT NULL,
    "paidOn" DATE,

    CONSTRAINT "emi_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_emi_rules" (
    "id" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "emiKind" "EmiKind" NOT NULL,
    "foreclosureFeeBps" INTEGER NOT NULL,
    "gstBps" INTEGER NOT NULL DEFAULT 1800,
    "disputeWindowDays" INTEGER,
    "cancelOnFullRefundOnly" BOOLEAN NOT NULL DEFAULT true,
    "escalationContacts" JSONB,
    "lastCheckedOn" DATE NOT NULL,

    CONSTRAINT "bank_emi_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_cases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emiId" TEXT,
    "merchant" "Merchant" NOT NULL,
    "chargePaise" BIGINT NOT NULL,
    "chargedOn" DATE NOT NULL,
    "disputeDeadlineOn" DATE,
    "status" "CaseStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "merchantOrderId" TEXT,
    "item" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'kept',
    "refundPaise" BIGINT NOT NULL DEFAULT 0,
    "refundPostedOn" DATE,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_events" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "CaseEventType" NOT NULL,
    "reference" TEXT,
    "note" TEXT,

    CONSTRAINT "case_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectType" "ReminderSubject" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "remindOn" TIMESTAMP(3) NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_accounts_userId_idx" ON "auth_accounts"("userId");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE INDEX "money_accounts_userId_idx" ON "money_accounts"("userId");

-- CreateIndex
CREATE INDEX "categories_userId_idx" ON "categories"("userId");

-- CreateIndex
CREATE INDEX "transactions_userId_occurredOn_idx" ON "transactions"("userId", "occurredOn");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_categoryId_month_key" ON "budgets"("userId", "categoryId", "month");

-- CreateIndex
CREATE INDEX "bills_userId_nextDueOn_idx" ON "bills"("userId", "nextDueOn");

-- CreateIndex
CREATE INDEX "emis_userId_idx" ON "emis"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "emi_installments_emiId_number_key" ON "emi_installments"("emiId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "bank_emi_rules_bankCode_emiKind_key" ON "bank_emi_rules"("bankCode", "emiKind");

-- CreateIndex
CREATE INDEX "purchase_cases_userId_idx" ON "purchase_cases"("userId");

-- CreateIndex
CREATE INDEX "orders_caseId_idx" ON "orders"("caseId");

-- CreateIndex
CREATE INDEX "case_events_caseId_idx" ON "case_events"("caseId");

-- CreateIndex
CREATE INDEX "reminders_remindOn_sentAt_idx" ON "reminders"("remindOn", "sentAt");

-- CreateIndex
CREATE INDEX "consents_userId_idx" ON "consents"("userId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "money_accounts" ADD CONSTRAINT "money_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "money_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "money_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emis" ADD CONSTRAINT "emis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emis" ADD CONSTRAINT "emis_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "money_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emis" ADD CONSTRAINT "emis_bankRuleId_fkey" FOREIGN KEY ("bankRuleId") REFERENCES "bank_emi_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emi_installments" ADD CONSTRAINT "emi_installments_emiId_fkey" FOREIGN KEY ("emiId") REFERENCES "emis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_cases" ADD CONSTRAINT "purchase_cases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_cases" ADD CONSTRAINT "purchase_cases_emiId_fkey" FOREIGN KEY ("emiId") REFERENCES "emis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "purchase_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "purchase_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
