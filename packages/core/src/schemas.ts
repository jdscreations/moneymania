import { z } from "zod";
import { billFrequencies } from "./bills";
import { isIsoDate } from "./dates";

const paise = z.number().int().safe();
const positivePaise = paise.positive();
const isoDate = z.string().refine(isIsoDate, "Use a YYYY-MM-DD date");

export const moneyAccountTypes = ["cash", "bank", "upi", "credit_card", "wallet"] as const;
export const transactionKinds = ["income", "expense", "transfer", "refund"] as const;
export const incomeSources = ["salary", "freelance", "gig", "business", "cash", "interest", "other"] as const;

export const moneyAccountInput = z.object({
  type: z.enum(moneyAccountTypes),
  name: z.string().trim().min(1).max(60),
  bankCode: z.string().trim().max(20).optional(),
  openingBalancePaise: paise.default(0),
});
export type MoneyAccountInput = z.input<typeof moneyAccountInput>;

export const categoryInput = z.object({
  name: z.string().trim().min(1).max(40),
  kind: z.enum(["income", "expense"]),
  icon: z.string().max(40).optional(),
});
export type CategoryInput = z.input<typeof categoryInput>;

export const transactionInput = z
  .object({
    accountId: z.string().min(1),
    kind: z.enum(transactionKinds),
    amountPaise: positivePaise,
    occurredOn: isoDate,
    categoryId: z.string().min(1).nullish(),
    incomeSource: z.enum(incomeSources).nullish(),
    transferAccountId: z.string().min(1).nullish(),
    note: z.string().trim().max(200).nullish(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  })
  .refine((t) => t.kind !== "transfer" || (t.transferAccountId && t.transferAccountId !== t.accountId), {
    message: "A transfer needs a different destination account",
    path: ["transferAccountId"],
  })
  .refine((t) => t.kind === "income" || !t.incomeSource, {
    message: "Only income can have an income source",
    path: ["incomeSource"],
  });
export type TransactionInput = z.input<typeof transactionInput>;

export const budgetInput = z.object({
  categoryId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Use a YYYY-MM month"),
  limitPaise: positivePaise,
});
export type BudgetInput = z.input<typeof budgetInput>;

export const periodQuery = z.object({
  period: z.enum(["day", "week", "month"]).default("day"),
  date: isoDate,
});

export const billInput = z.object({
  name: z.string().trim().min(1).max(60),
  amountPaise: positivePaise,
  frequency: z.enum(billFrequencies),
  /** Next date this bill is due. */
  nextDueOn: isoDate,
  accountId: z.string().min(1).nullish(),
  categoryId: z.string().min(1).nullish(),
  autopay: z.boolean().default(false),
  remindDaysBefore: z.number().int().min(0).max(30).default(3),
});
export type BillInput = z.input<typeof billInput>;

export const payBillInput = z.object({
  /** Also log the payment as spending from this account. */
  accountId: z.string().min(1).nullish(),
  paidOn: isoDate,
  /** Amount actually paid, when it differs from the usual bill amount. */
  amountPaise: positivePaise.optional(),
});
export type PayBillInput = z.input<typeof payBillInput>;

export const emiKinds = ["card_merchant", "card_conversion", "loan", "bnpl"] as const;

export const emiInput = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(emiKinds),
  lender: z.string().trim().min(1).max(60),
  principalPaise: positivePaise,
  annualRateBps: z.number().int().min(0).max(6000),
  tenureMonths: z.number().int().min(1).max(360),
  firstDueOn: isoDate,
  gstOnInterestBps: z.number().int().min(0).max(2800).default(1800),
  processingFeePaise: paise.min(0).default(0),
  accountId: z.string().min(1).nullish(),
  remindDaysBefore: z.number().int().min(0).max(30).default(3),
  /** Installments already paid before adding the EMI to MoneyMania. */
  alreadyPaid: z.number().int().min(0).default(0),
});
export type EmiInput = z.input<typeof emiInput>;

export const payInstallmentInput = z.object({
  accountId: z.string().min(1).nullish(),
  paidOn: isoDate,
});
export type PayInstallmentInput = z.input<typeof payInstallmentInput>;

export const prepaymentInput = z.object({
  amountPaise: positivePaise,
  mode: z.enum(["reduce_tenure", "reduce_emi"]),
});
export type PrepaymentInput = z.input<typeof prepaymentInput>;

export const pushTokenInput = z.object({
  token: z.string().min(10).max(200),
  platform: z.enum(["ios", "android", "web"]),
});
