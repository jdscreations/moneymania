import { billInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { billDto } from "@/server/bills";
import { fromIsoDate, handle, parseBody, requireUserId } from "@/server/http";
import { ownAccount, usableCategory } from "@/server/ledger";

export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const bills = await prisma.bill.findMany({ where: { userId, archivedAt: null }, orderBy: [{ nextDueOn: "asc" }, { name: "asc" }] });
  return Response.json(bills.map(billDto));
});

export const POST = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const input = await parseBody(req, billInput);
  if (input.accountId) await ownAccount(userId, input.accountId);
  if (input.categoryId) await usableCategory(userId, input.categoryId);
  const bill = await prisma.bill.create({
    data: {
      ...input,
      userId,
      amountPaise: BigInt(input.amountPaise),
      nextDueOn: fromIsoDate(input.nextDueOn),
      dueDay: Number(input.nextDueOn.slice(8, 10)),
    },
  });
  return Response.json(billDto(bill), { status: 201 });
});
