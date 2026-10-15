import { budgetInput, periodRange } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { fromIsoDate, handle, HttpError, parseBody, requireUserId } from "@/server/http";
import { summaryFor, usableCategory } from "@/server/ledger";
import { budgetDto } from "@/server/serialize";

async function spentByCategory(userId: string, month: string) {
  const { from, to } = periodRange("month", `${month}-01`);
  const summary = await summaryFor(userId, from, to);
  return new Map(summary.expenseByCategory.map((c) => [c.categoryId, c.totalPaise]));
}

export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) throw new HttpError(400, "Pass month as YYYY-MM");
  const budgets = await prisma.budget.findMany({ where: { userId, month: fromIsoDate(`${month}-01`) } });
  const spent = await spentByCategory(userId, month);
  return Response.json(budgets.map((b) => budgetDto(b, spent.get(b.categoryId) ?? 0)));
});

/** Create or replace the budget for one category and month. */
export const PUT = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const input = await parseBody(req, budgetInput);
  const category = await usableCategory(userId, input.categoryId);
  if (category.kind !== "expense") throw new HttpError(400, "categoryId: budgets are for spending categories");
  const month = fromIsoDate(`${input.month}-01`);
  const budget = await prisma.budget.upsert({
    where: { userId_categoryId_month: { userId, categoryId: input.categoryId, month } },
    create: { userId, categoryId: input.categoryId, month, limitPaise: BigInt(input.limitPaise) },
    update: { limitPaise: BigInt(input.limitPaise) },
  });
  const spent = await spentByCategory(userId, input.month);
  return Response.json(budgetDto(budget, spent.get(input.categoryId) ?? 0));
});
