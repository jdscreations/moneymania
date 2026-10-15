import { addMonths, emiSchedule, periodRange, todayIn, type CalculatorContextDto } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { termsOf } from "@/server/emis";
import { handle, requireUserId } from "@/server/http";
import { balancesFor, summaryFor } from "@/server/ledger";

const perMonth = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, half_yearly: 1 / 6, yearly: 1 / 12, once: 0 } as const;

/** Averages from the last three full months, today's liquid money and fixed monthly outgo, for the calculators. */
export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const today = todayIn();
  const months = [3, 2, 1].map((n) => periodRange("month", addMonths(periodRange("month", today).from, -n)));
  const [summaries, accounts, emis, bills] = await Promise.all([
    Promise.all(months.map((m) => summaryFor(userId, m.from, m.to))),
    prisma.moneyAccount.findMany({ where: { userId, archivedAt: null } }),
    prisma.emi.findMany({ where: { userId, status: "active" }, include: { installments: true } }),
    prisma.bill.findMany({ where: { userId, archivedAt: null, nextDueOn: { not: null } } }),
  ]);

  const used = summaries.filter((s) => s.incomePaise > 0 || s.expensePaise > 0);
  const avg = (pick: (s: (typeof summaries)[number]) => number) => (used.length ? Math.round(used.reduce((t, s) => t + pick(s), 0) / used.length) : 0);
  const balances = await balancesFor(userId, accounts);
  const liquid = accounts.filter((a) => a.type !== "credit_card").reduce((t, a) => t + (balances.get(a.id) ?? 0), 0);

  const emiMonthly = emis.reduce((t, e) => {
    const next = [...e.installments].sort((a, b) => a.number - b.number).find((i) => !i.paidOn);
    if (!next) return t;
    // Use a regular installment so a one-off broken-period charge on the first one doesn't inflate the figure.
    const rows = emiSchedule(termsOf(e));
    return t + rows[next.number === 1 && rows.length > 1 ? 1 : next.number - 1]!.total;
  }, 0);
  const billsMonthly = Math.round(bills.reduce((t, b) => t + Number(b.amountPaise) * perMonth[b.frequency], 0));

  const dto: CalculatorContextDto = {
    months: used.length,
    avgMonthlyIncomePaise: avg((s) => s.incomePaise),
    avgMonthlySpendPaise: avg((s) => s.expensePaise),
    liquidPaise: liquid,
    emiMonthlyPaise: emiMonthly,
    billsMonthlyPaise: billsMonthly,
  };
  return Response.json(dto);
});
