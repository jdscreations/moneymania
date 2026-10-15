import { z } from "zod";
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
