import type { IsoDate } from "./dates";
import type { Paise } from "./money";
import type { PeriodSummary } from "./summary";
import type { incomeSources, moneyAccountTypes, transactionKinds } from "./schemas";

/** JSON shapes returned by the MoneyMania API. Amounts are paise as plain numbers. */
export interface MoneyAccountDto {
  id: string;
  type: (typeof moneyAccountTypes)[number];
  name: string;
  bankCode: string | null;
  openingBalancePaise: Paise;
  balancePaise: Paise;
}

export interface CategoryDto {
  id: string;
  name: string;
  kind: "income" | "expense";
  icon: string | null;
  isDefault: boolean;
}

export interface TransactionDto {
  id: string;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  kind: (typeof transactionKinds)[number];
  amountPaise: Paise;
  occurredOn: IsoDate;
  incomeSource: (typeof incomeSources)[number] | null;
  note: string | null;
  tags: string[];
}

export interface BudgetDto {
  id: string;
  categoryId: string;
  month: string;
  limitPaise: Paise;
  spentPaise: Paise;
}

export type SummaryDto = PeriodSummary;
