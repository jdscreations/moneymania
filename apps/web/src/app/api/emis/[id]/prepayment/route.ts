import { prepaymentInput, prepaymentWhatIf } from "@moneymania/core";
import { ownEmi, termsOf } from "@/server/emis";
import { handle, HttpError, parseBody, requireUserId } from "@/server/http";

/** What-if only: how much a part-prepayment now would save. Nothing is changed. */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/emis/[id]/prepayment">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const emi = await ownEmi(userId, id);
  const input = await parseBody(req, prepaymentInput);
  const paidCount = emi.installments.filter((i) => i.paidOn).length;
  try {
    return Response.json(prepaymentWhatIf(termsOf(emi), paidCount, input.amountPaise, input.mode));
  } catch (err) {
    if (err instanceof RangeError) throw new HttpError(400, err.message);
    throw err;
  }
});
