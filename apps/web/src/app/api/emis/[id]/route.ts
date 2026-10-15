import { prisma } from "@moneymania/db";
import { emiDetailDto, ownEmi } from "@/server/emis";
import { handle, noContent, requireUserId } from "@/server/http";

export const GET = handle(async (req: Request, ctx: RouteContext<"/api/emis/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const emi = await ownEmi(userId, id);
  return Response.json(emiDetailDto(emi, emi.installments));
});

export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/emis/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  await ownEmi(userId, id);
  await prisma.emi.delete({ where: { id } });
  return noContent();
});
