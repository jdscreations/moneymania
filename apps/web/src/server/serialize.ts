import type { BudgetDto, CategoryDto, MoneyAccountDto, TransactionDto } from "@moneymania/core";
import type { Budget, Category, MoneyAccount, Transaction } from "@moneymania/db";
import { toIsoDate } from "./http";

export const accountDto = (a: MoneyAccount, balancePaise: number): MoneyAccountDto => ({
  id: a.id,
  type: a.type,
  name: a.name,
  bankCode: a.bankCode,
  openingBalancePaise: Number(a.openingBalancePaise),
  balancePaise,
});

export const categoryDto = (c: Category): CategoryDto => ({
  id: c.id,
  name: c.name,
  kind: c.kind,
  icon: c.icon,
  isDefault: c.userId === null,
});

export const transactionDto = (t: Transaction): TransactionDto => ({
  id: t.id,
  accountId: t.accountId,
  transferAccountId: t.transferAccountId,
  categoryId: t.categoryId,
  kind: t.kind,
  amountPaise: Number(t.amountPaise),
  occurredOn: toIsoDate(t.occurredOn),
  incomeSource: t.incomeSource,
  note: t.note,
  tags: t.tags,
});

export const budgetDto = (b: Budget, spentPaise: number): BudgetDto => ({
  id: b.id,
  categoryId: b.categoryId,
  month: toIsoDate(b.month).slice(0, 7),
  limitPaise: Number(b.limitPaise),
  spentPaise,
});
