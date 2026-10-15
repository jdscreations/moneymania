import { formatINR, orderUpdate } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { caseDetail, logEvent, ownCase } from "@/server/cases";
import { fromIsoDate, handle, HttpError, parseBody, requireUserId, toIsoDate } from "@/server/http";

type Ctx = RouteContext<"/api/cases/[id]/orders/[orderId]">;

const statusNote = { kept: "kept", cancelled: "cancelled", return_requested: "return requested", returned: "returned" } as const;

async function ownOrder(userId: string, id: string, orderId: string) {
  const c = await ownCase(userId, id);
  const order = c.orders.find((o) => o.id === orderId);
  if (!order) throw new HttpError(404, "Order not found");
  return order;
}

/** Updates an order and writes what changed (status, refund amount, refund posting) to the case log. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id, orderId } = await ctx.params;
  const before = await ownOrder(userId, id, orderId);
  const input = await parseBody(req, orderUpdate);
  const after = await prisma.order.update({
    where: { id: orderId },
    data: {
      merchantOrderId: input.merchantOrderId,
      item: input.item,
      amountPaise: input.amountPaise === undefined ? undefined : BigInt(input.amountPaise),
      status: input.status,
      refundPaise: input.refundPaise === undefined ? undefined : BigInt(input.refundPaise),
      refundPostedOn: input.refundPostedOn === undefined ? undefined : input.refundPostedOn ? fromIsoDate(input.refundPostedOn) : null,
    },
  });

  const changes: string[] = [];
  if (after.status !== before.status) changes.push(`marked ${statusNote[after.status]}`);
  if (after.refundPaise !== before.refundPaise) changes.push(`refund set to ${formatINR(Number(after.refundPaise))}`);
  if (after.refundPostedOn && !before.refundPostedOn) changes.push(`refund of ${formatINR(Number(after.refundPaise))} posted on ${toIsoDate(after.refundPostedOn)}`);
  if (!after.refundPostedOn && before.refundPostedOn) changes.push("refund no longer marked as posted");
  if (changes.length > 0) await logEvent(id, "note", `${after.item}: ${changes.join(", ")}.`);
  return Response.json(await caseDetail(userId, id));
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id, orderId } = await ctx.params;
  const order = await ownOrder(userId, id, orderId);
  await prisma.order.delete({ where: { id: orderId } });
  await logEvent(id, "note", `Removed ${order.item}.`);
  return Response.json(await caseDetail(userId, id));
});
