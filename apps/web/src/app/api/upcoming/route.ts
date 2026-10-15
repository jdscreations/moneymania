import { todayIn } from "@moneymania/core";
import { handle, requireUserId } from "@/server/http";
import { dueItems } from "@/server/upcoming";

export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days") ?? 30) || 30));
  const items = await dueItems(todayIn(), days, userId);
  return Response.json(items.map((i) => ({ type: i.type, id: i.id, name: i.name, dueOn: i.dueOn, amountPaise: i.amountPaise, daysLeft: i.daysLeft, autopay: i.autopay })));
});
