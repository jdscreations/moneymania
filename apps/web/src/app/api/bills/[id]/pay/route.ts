import { nextBillDue, payBillInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { billDto, ownBill } from "@/server/bills";
import { fromIsoDate, handle, HttpError, parseBody, requireUserId, toIsoDate } from "@/server/http";
import { ownAccount } from "@/server/ledger";

/** Mark the current due date paid, optionally log the spend, and move the bill to its next due date. */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/bills/[id]/pay">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const bill = await ownBill(userId, id);
  if (!bill.nextDueOn) throw new HttpError(400, "This bill has nothing due");
  const input = await parseBody(req, payBillInput);
  if (input.accountId) await ownAccount(userId, input.accountId);

  const next = nextBillDue(bill.frequency, toIsoDate(bill.nextDueOn), bill.dueDay);
  const [updated] = await prisma.$transaction([
    prisma.bill.update({
      where: { id },
      data: { lastPaidOn: fromIsoDate(input.paidOn), nextDueOn: next ? fromIsoDate(next) : null },
    }),
    ...(input.accountId
      ? [
          prisma.transaction.create({
            data: {
              userId,
              accountId: input.accountId,
              kind: "expense",
              amountPaise: BigInt(input.amountPaise ?? Number(bill.amountPaise)),
              occurredOn: fromIsoDate(input.paidOn),
              categoryId: bill.categoryId,
              note: bill.name,
            },
          }),
        ]
      : []),
  ]);
  return Response.json(billDto(updated));
});
