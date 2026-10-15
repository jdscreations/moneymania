import { z } from "zod";
import { billFrequencies } from "./bills";
import { daysBetween, isIsoDate } from "./dates";
import { orderStatuses } from "./refund";

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

export const merchants = ["amazon_in", "flipkart", "other"] as const;
export const caseEventTypes = ["call", "email", "sr_number", "promise", "escalation", "note"] as const;

const orderFields = {
  merchantOrderId: z.string().trim().max(40).nullish(),
  item: z.string().trim().min(1).max(80),
  amountPaise: positivePaise,
  status: z.enum(orderStatuses),
  /** Refund expected or received. */
  refundPaise: paise.min(0),
  /** Date the refund showed up on the card statement. */
  refundPostedOn: isoDate.nullish(),
};

export const orderInput = z.object({
  ...orderFields,
  status: orderFields.status.default("kept"),
  refundPaise: orderFields.refundPaise.default(0),
});
export type OrderInput = z.input<typeof orderInput>;
/** Only the fields sent change; no defaults, so a partial update never resets the status or refund. */
export const orderUpdate = z.object(orderFields).partial();
export type OrderUpdate = z.input<typeof orderUpdate>;

export const caseInput = z
  .object({
    title: z.string().trim().max(80).default(""),
    merchant: z.enum(merchants),
    /** "sbi" uses SBI Card's merchant EMI rules; anything else needs the fee and dispute window. */
    bankCode: z.string().trim().min(1).max(20),
    lender: z.string().trim().min(1).max(60).optional(),
    accountId: z.string().min(1).nullish(),
    chargePaise: positivePaise,
    chargedOn: isoDate,
    /** Statement date that bills the first installment. */
    firstStatementOn: isoDate,
    annualRateBps: z.number().int().min(0).max(6000),
    tenureMonths: z.number().int().min(1).max(60),
    gstOnInterestBps: z.number().int().min(0).max(2800).default(1800),
    processingFeePaise: paise.min(0).default(0),
    foreclosureFeeBps: z.number().int().min(0).max(1000).nullish(),
    disputeWindowDays: z.number().int().min(1).max(540).nullish(),
    orders: z.array(orderInput).min(1).max(30),
  })
  .refine((c) => daysBetween(c.chargedOn, c.firstStatementOn) >= 0 && daysBetween(c.chargedOn, c.firstStatementOn) <= 62, {
    message: "The first statement must fall within two months after the charge",
    path: ["firstStatementOn"],
  });
export type CaseInput = z.input<typeof caseInput>;

export const caseUpdate = z.object({
  title: z.string().trim().max(80).optional(),
  status: z.enum(["open", "resolved"]).optional(),
  disputeDeadlineOn: isoDate.nullish(),
});
export type CaseUpdate = z.input<typeof caseUpdate>;

export const caseEventInput = z.object({
  type: z.enum(caseEventTypes),
  reference: z.string().trim().max(60).nullish(),
  note: z.string().trim().max(500).nullish(),
  on: isoDate.optional(),
});
export type CaseEventInput = z.input<typeof caseEventInput>;

export const closeEmiInput = z.object({
  outcome: z.enum(["foreclosed", "cancelled"]),
  on: isoDate,
  reference: z.string().trim().max(60).nullish(),
});
export type CloseEmiInput = z.input<typeof closeEmiInput>;
