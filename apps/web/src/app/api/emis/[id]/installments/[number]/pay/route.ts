import { payInstallmentInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { emiDetailDto, ownEmi } from "@/server/emis";
import { fromIsoDate, handle, HttpError, parseBody, requireUserId } from "@/server/http";
import { ownAccount } from "@/server/ledger";

/** Mark one installment paid and, if an account is given, log it as EMI spending. */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/emis/[id]/installments/[number]/pay">) => {
  const userId = await requireUserId(req);
  const { id, number } = await ctx.params;
  const emi = await ownEmi(userId, id);
  const installment = emi.installments.find((i) => i.number === Number(number));
  if (!installment) throw new HttpError(404, "Installment not found");
  if (installment.paidOn) throw new HttpError(409, "That installment is already marked paid");
  const input = await parseBody(req, payInstallmentInput);
  if (input.accountId) await ownAccount(userId, input.accountId);

  const remainingUnpaid = emi.installments.filter((i) => !i.paidOn).length - 1;
  await prisma.$transaction([
    prisma.emiInstallment.update({ where: { id: installment.id }, data: { paidOn: fromIsoDate(input.paidOn) } }),
    ...(remainingUnpaid === 0 ? [prisma.emi.update({ where: { id }, data: { status: "closed" } })] : []),
    ...(input.accountId
      ? [
          prisma.transaction.create({
            data: {
              userId,
              accountId: input.accountId,
              kind: "expense",
              amountPaise: installment.principalPaise + installment.interestPaise + installment.gstPaise,
              occurredOn: fromIsoDate(input.paidOn),
              categoryId: "cat_emi",
              note: `${emi.name} EMI ${installment.number} of ${emi.tenureMonths}`,
            },
          }),
        ]
      : []),
  ]);
  const fresh = await ownEmi(userId, id);
  return Response.json(emiDetailDto(fresh, fresh.installments));
});
