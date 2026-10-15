import { moneyAccountInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { handle, noContent, parseBody, requireUserId } from "@/server/http";
import { balancesFor, ownAccount } from "@/server/ledger";
import { accountDto } from "@/server/serialize";

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/accounts/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  await ownAccount(userId, id);
  const input = await parseBody(req, moneyAccountInput.partial());
  const account = await prisma.moneyAccount.update({
    where: { id },
    data: {
      ...input,
      openingBalancePaise: input.openingBalancePaise === undefined ? undefined : BigInt(input.openingBalancePaise),
    },
  });
  const balances = await balancesFor(userId, [account]);
  return Response.json(accountDto(account, balances.get(id) ?? 0));
});

/** Archive rather than delete, so past entries keep their account. */
export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/accounts/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  await ownAccount(userId, id);
  await prisma.moneyAccount.update({ where: { id }, data: { archivedAt: new Date() } });
  return noContent();
});
