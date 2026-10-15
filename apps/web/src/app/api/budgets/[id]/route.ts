import { prisma } from "@moneymania/db";
import { handle, HttpError, noContent, requireUserId } from "@/server/http";

export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/budgets/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { count } = await prisma.budget.deleteMany({ where: { id, userId } });
  if (count === 0) throw new HttpError(404, "Budget not found");
  return noContent();
});
