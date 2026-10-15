import { caseUpdate } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { caseDetail, logEvent, ownCase } from "@/server/cases";
import { fromIsoDate, handle, noContent, parseBody, requireUserId } from "@/server/http";

export const GET = handle(async (req: Request, ctx: RouteContext<"/api/cases/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  return Response.json(await caseDetail(userId, id));
});

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/cases/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const c = await ownCase(userId, id);
  const input = await parseBody(req, caseUpdate);
  await prisma.purchaseCase.update({
    where: { id },
    data: {
      title: input.title,
      status: input.status,
      disputeDeadlineOn: input.disputeDeadlineOn === undefined ? undefined : input.disputeDeadlineOn ? fromIsoDate(input.disputeDeadlineOn) : null,
    },
  });
  if (input.status && input.status !== c.status) await logEvent(id, "note", input.status === "resolved" ? "Case marked resolved." : "Case reopened.");
  return Response.json(await caseDetail(userId, id));
});

/** Deletes the case and the EMI it created. */
export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/cases/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const c = await ownCase(userId, id);
  await prisma.$transaction([
    prisma.purchaseCase.delete({ where: { id } }),
    ...(c.emiId ? [prisma.emi.delete({ where: { id: c.emiId } })] : []),
  ]);
  return noContent();
});
