import { eachDay, type IsoDate } from "./dates";
import type { Paise } from "./money";

/** The fields of a transaction that summaries need. */
export interface LedgerEntry {
  kind: "income" | "expense" | "transfer" | "refund";
  amountPaise: Paise;
  occurredOn: IsoDate;
  categoryId?: string | null;
  accountId: string;
  transferAccountId?: string | null;
}

export interface CategoryTotal {
  categoryId: string | null;
  totalPaise: Paise;
}

export interface DayTotal {
  date: IsoDate;
  incomePaise: Paise;
  expensePaise: Paise;
  netPaise: Paise;
}

export interface PeriodSummary {
  from: IsoDate;
  to: IsoDate;
  incomePaise: Paise;
  /** Spending after refunds are taken off. */
  expensePaise: Paise;
  netPaise: Paise;
  expenseByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
  days: DayTotal[];
}

/**
 * Earned vs spent for a date range. Transfers between own accounts are neither income
 * nor spending; refunds reduce spending (in their category) rather than counting as income.
 */
export function summarize(entries: LedgerEntry[], from: IsoDate, to: IsoDate): PeriodSummary {
  const byDay = new Map(eachDay(from, to).map((d) => [d, { income: 0, expense: 0 }]));
  const expenseCats = new Map<string | null, Paise>();
  const incomeCats = new Map<string | null, Paise>();
  let income = 0;
  let expense = 0;

  for (const e of entries) {
    const day = byDay.get(e.occurredOn);
    if (!day || e.kind === "transfer") continue;
    const cat = e.categoryId ?? null;
    if (e.kind === "income") {
      income += e.amountPaise;
      day.income += e.amountPaise;
      incomeCats.set(cat, (incomeCats.get(cat) ?? 0) + e.amountPaise);
    } else {
      const signed = e.kind === "refund" ? -e.amountPaise : e.amountPaise;
      expense += signed;
      day.expense += signed;
      expenseCats.set(cat, (expenseCats.get(cat) ?? 0) + signed);
    }
  }

  const sorted = (m: Map<string | null, Paise>) =>
    [...m].map(([categoryId, totalPaise]) => ({ categoryId, totalPaise })).sort((a, b) => b.totalPaise - a.totalPaise);

  return {
    from,
    to,
    incomePaise: income,
    expensePaise: expense,
    netPaise: income - expense,
    expenseByCategory: sorted(expenseCats),
    incomeByCategory: sorted(incomeCats),
    days: [...byDay].map(([date, d]) => ({
      date,
      incomePaise: d.income,
      expensePaise: d.expense,
      netPaise: d.income - d.expense,
    })),
  };
}

/** Current balance of one account from its opening balance and every entry touching it. */
export function accountBalance(accountId: string, openingBalancePaise: Paise, entries: LedgerEntry[]): Paise {
  let balance = openingBalancePaise;
  for (const e of entries) {
    if (e.kind === "transfer") {
      if (e.accountId === accountId) balance -= e.amountPaise;
      if (e.transferAccountId === accountId) balance += e.amountPaise;
    } else if (e.accountId === accountId) {
      balance += e.kind === "expense" ? -e.amountPaise : e.amountPaise;
    }
  }
  return balance;
}
