import { formatINR, orderInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { caseDetail, logEvent, ownCase } from "@/server/cases";
import { fromIsoDate, handle, parseBody, requireUserId } from "@/server/http";

export const POST = handle(async (req: Request, ctx: RouteContext<"/api/cases/[id]/orders">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  await ownCase(userId, id);
  const o = await parseBody(req, orderInput);
  await prisma.order.create({
    data: {
      caseId: id,
      merchantOrderId: o.merchantOrderId ?? null,
      item: o.item,
      amountPaise: BigInt(o.amountPaise),
      status: o.status,
      refundPaise: BigInt(o.refundPaise),
      refundPostedOn: o.refundPostedOn ? fromIsoDate(o.refundPostedOn) : null,
    },
  });
  await logEvent(id, "note", `Added ${o.item} (${formatINR(o.amountPaise)}).`);
  return Response.json(await caseDetail(userId, id), { status: 201 });
});
