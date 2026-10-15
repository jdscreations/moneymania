import { moneyAccountInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { handle, parseBody, requireUserId } from "@/server/http";
import { balancesFor } from "@/server/ledger";
import { accountDto } from "@/server/serialize";

export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const accounts = await prisma.moneyAccount.findMany({ where: { userId, archivedAt: null }, orderBy: { createdAt: "asc" } });
  const balances = await balancesFor(userId, accounts);
  return Response.json(accounts.map((a) => accountDto(a, balances.get(a.id) ?? 0)));
});

export const POST = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const input = await parseBody(req, moneyAccountInput);
  const account = await prisma.moneyAccount.create({
    data: { ...input, userId, openingBalancePaise: BigInt(input.openingBalancePaise) },
  });
  return Response.json(accountDto(account, input.openingBalancePaise), { status: 201 });
});
