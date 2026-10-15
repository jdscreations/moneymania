import { periodQuery, periodRange } from "@moneymania/core";
import { handle, HttpError, requireUserId } from "@/server/http";
import { summaryFor } from "@/server/ledger";

export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const query = periodQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!query.success) throw new HttpError(400, "Pass period (day, week or month) and date as YYYY-MM-DD");
  const { from, to } = periodRange(query.data.period, query.data.date);
  return Response.json(await summaryFor(userId, from, to));
});
