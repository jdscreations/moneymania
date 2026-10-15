import { addDays, daysBetween, type IsoDate, type UpcomingDto } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { fromIsoDate, toIsoDate } from "./http";

export interface DueItem extends UpcomingDto {
  userId: string;
  remindDaysBefore: number;
}

/** Dispute deadlines are reminded a week ahead, so there is time to call the bank. */
const DISPUTE_REMIND_DAYS = 7;

/**
 * Bills, unpaid EMI installments and dispute deadlines on open purchase cases due between `today` (including anything overdue) and `today + days`,
 * for one user or, when `userId` is omitted, for everyone (used by the reminder job).
 */
export async function dueItems(today: IsoDate, days: number, userId?: string): Promise<DueItem[]> {
  const until = fromIsoDate(addDays(today, days));
  const [bills, installments, cases] = await Promise.all([
    prisma.bill.findMany({ where: { userId, archivedAt: null, nextDueOn: { not: null, lte: until } } }),
    prisma.emiInstallment.findMany({
      where: { paidOn: null, dueOn: { lte: until }, emi: { userId, status: "active" } },
      include: { emi: true },
    }),
    prisma.purchaseCase.findMany({
      where: { userId, status: "open", disputeDeadlineOn: { not: null, gte: fromIsoDate(today), lte: until } },
    }),
  ]);

  const items: DueItem[] = [
    ...bills.map((b) => {
      const dueOn = toIsoDate(b.nextDueOn!);
      return {
        type: "bill" as const,
        id: b.id,
        userId: b.userId,
        name: b.name,
        dueOn,
        amountPaise: Number(b.amountPaise),
        daysLeft: daysBetween(today, dueOn),
        autopay: b.autopay,
        remindDaysBefore: b.remindDaysBefore,
      };
    }),
    ...installments.map((i) => {
      const dueOn = toIsoDate(i.dueOn);
      return {
        type: "emi" as const,
        id: i.emiId,
        userId: i.emi.userId,
        name: `${i.emi.name} (${i.number} of ${i.emi.tenureMonths})`,
        dueOn,
        amountPaise: Number(i.principalPaise + i.interestPaise + i.gstPaise),
        daysLeft: daysBetween(today, dueOn),
        autopay: false,
        remindDaysBefore: i.emi.remindDaysBefore,
      };
    }),
    ...cases.map((c) => {
      const dueOn = toIsoDate(c.disputeDeadlineOn!);
      return {
        type: "dispute" as const,
        id: c.id,
        userId: c.userId,
        name: `Last day to dispute: ${c.title}`,
        dueOn,
        amountPaise: Number(c.chargePaise),
        daysLeft: daysBetween(today, dueOn),
        autopay: false,
        remindDaysBefore: DISPUTE_REMIND_DAYS,
      };
    }),
  ];
  return items.sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}

