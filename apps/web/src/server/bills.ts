import type { BillDto } from "@moneymania/core";
import { prisma, type Bill } from "@moneymania/db";
import { HttpError, toIsoDate } from "./http";

export const billDto = (b: Bill): BillDto => ({
  id: b.id,
  name: b.name,
  amountPaise: Number(b.amountPaise),
  frequency: b.frequency,
  nextDueOn: b.nextDueOn ? toIsoDate(b.nextDueOn) : null,
  lastPaidOn: b.lastPaidOn ? toIsoDate(b.lastPaidOn) : null,
  accountId: b.accountId,
  categoryId: b.categoryId,
  autopay: b.autopay,
  remindDaysBefore: b.remindDaysBefore,
});

export async function ownBill(userId: string, id: string) {
  const bill = await prisma.bill.findFirst({ where: { id, userId, archivedAt: null } });
  if (!bill) throw new HttpError(404, "Bill not found");
  return bill;
}
