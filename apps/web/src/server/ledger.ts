import { accountBalance, summarize, type IsoDate, type LedgerEntry } from "@moneymania/core";
import { prisma, type MoneyAccount } from "@moneymania/db";
import { fromIsoDate, HttpError, toIsoDate } from "./http";

const entryFields = {
  kind: true,
  amountPaise: true,
  occurredOn: true,
  categoryId: true,
  accountId: true,
  transferAccountId: true,
} as const;

type EntryRow = {
  kind: LedgerEntry["kind"];
  amountPaise: bigint;
  occurredOn: Date;
  categoryId: string | null;
  accountId: string;
  transferAccountId: string | null;
};

const toEntry = (r: EntryRow): LedgerEntry => ({ ...r, amountPaise: Number(r.amountPaise), occurredOn: toIsoDate(r.occurredOn) });

export async function entriesBetween(userId: string, from: IsoDate, to: IsoDate): Promise<LedgerEntry[]> {
  const rows = await prisma.transaction.findMany({
    where: { userId, occurredOn: { gte: fromIsoDate(from), lte: fromIsoDate(to) } },
    select: entryFields,
  });
  return rows.map(toEntry);
}

export async function summaryFor(userId: string, from: IsoDate, to: IsoDate) {
  return summarize(await entriesBetween(userId, from, to), from, to);
}

/** Current balance of each of the user's accounts. */
export async function balancesFor(userId: string, accounts: MoneyAccount[]): Promise<Map<string, number>> {
  const rows = await prisma.transaction.findMany({ where: { userId }, select: entryFields });
  const entries = rows.map(toEntry);
  return new Map(accounts.map((a) => [a.id, accountBalance(a.id, Number(a.openingBalancePaise), entries)]));
}

export async function ownAccount(userId: string, id: string) {
  const account = await prisma.moneyAccount.findFirst({ where: { id, userId } });
  if (!account) throw new HttpError(404, "Account not found");
  return account;
}

/** A category the user can use: a built-in one or one of their own. */
export async function usableCategory(userId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, OR: [{ userId }, { userId: null }] } });
  if (!category) throw new HttpError(404, "Category not found");
  return category;
}
