import { closeEmiInput, formatINR } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { caseDetail, caseDto, logEvent, ownCase } from "@/server/cases";
import { fromIsoDate, handle, HttpError, parseBody, requireUserId } from "@/server/http";

/** Records that the bank foreclosed or cancelled the case's EMI, and resolves the case. */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/cases/[id]/close-emi">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const c = await ownCase(userId, id);
  if (!c.emi || c.emi.status !== "active") throw new HttpError(409, "This case has no active EMI to close");
  const input = await parseBody(req, closeEmiInput);
  const on = fromIsoDate(input.on);
  const payoff = caseDto(c, input.on).analysis?.foreclosure.payoff;

  await prisma.$transaction([
    prisma.emi.update({ where: { id: c.emi.id }, data: { status: input.outcome } }),
    // Installments billed after the closing date will never be charged.
    prisma.emiInstallment.deleteMany({ where: { emiId: c.emi.id, paidOn: null, dueOn: { gt: on } } }),
    prisma.purchaseCase.update({ where: { id }, data: { status: "resolved" } }),
  ]);
  const note =
    input.outcome === "foreclosed"
      ? `EMI foreclosed${payoff ? `; estimated payoff ${formatINR(payoff)}` : ""}.`
      : "Bank cancelled the EMI.";
  await logEvent(id, "note", note, input.reference, on);
  return Response.json(await caseDetail(userId, id));
});
