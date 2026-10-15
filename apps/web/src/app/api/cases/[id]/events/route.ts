import { caseEventInput } from "@moneymania/core";
import { caseDetail, logEvent, ownCase } from "@/server/cases";
import { fromIsoDate, handle, parseBody, requireUserId } from "@/server/http";

/** Adds a call, email, service request number, promise, escalation or note to the case log. */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/cases/[id]/events">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  await ownCase(userId, id);
  const e = await parseBody(req, caseEventInput);
  await logEvent(id, e.type, e.note ?? "", e.reference, e.on ? fromIsoDate(e.on) : undefined);
  return Response.json(await caseDetail(userId, id), { status: 201 });
});
