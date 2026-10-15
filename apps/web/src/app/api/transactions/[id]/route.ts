import { transactionInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { handle, HttpError, noContent, parseBody, requireUserId } from "@/server/http";
import { transactionDto } from "@/server/serialize";
import { transactionData } from "@/server/transactions";

async function ownTransaction(userId: string, id: string) {
  const row = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!row) throw new HttpError(404, "Entry not found");
  return row;
}

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/transactions/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  await ownTransaction(userId, id);
  const input = await parseBody(req, transactionInput);
  const row = await prisma.transaction.update({ where: { id }, data: await transactionData(userId, input) });
  return Response.json(transactionDto(row));
});

export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/transactions/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  await ownTransaction(userId, id);
  await prisma.transaction.delete({ where: { id } });
  return noContent();
});
