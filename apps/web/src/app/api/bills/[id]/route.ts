import { billInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { billDto, ownBill } from "@/server/bills";
import { fromIsoDate, handle, noContent, parseBody, requireUserId } from "@/server/http";
import { ownAccount, usableCategory } from "@/server/ledger";

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/bills/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  await ownBill(userId, id);
  const input = await parseBody(req, billInput);
  if (input.accountId) await ownAccount(userId, input.accountId);
  if (input.categoryId) await usableCategory(userId, input.categoryId);
  const bill = await prisma.bill.update({
    where: { id },
    data: {
      ...input,
      amountPaise: BigInt(input.amountPaise),
      nextDueOn: fromIsoDate(input.nextDueOn),
      dueDay: Number(input.nextDueOn.slice(8, 10)),
    },
  });
  return Response.json(billDto(bill));
});

export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/bills/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  await ownBill(userId, id);
  await prisma.bill.update({ where: { id }, data: { archivedAt: new Date() } });
  return noContent();
});
