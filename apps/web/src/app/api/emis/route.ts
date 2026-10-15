import { emiInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { buildInstallments, emiDetailDto, emiDto } from "@/server/emis";
import { fromIsoDate, handle, HttpError, parseBody, requireUserId } from "@/server/http";
import { ownAccount } from "@/server/ledger";

export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const emis = await prisma.emi.findMany({ where: { userId }, include: { installments: true }, orderBy: { createdAt: "desc" } });
  return Response.json(emis.map((e) => emiDto(e, e.installments)));
});

export const POST = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const { alreadyPaid, ...input } = await parseBody(req, emiInput);
  if (input.accountId) await ownAccount(userId, input.accountId);
  if (alreadyPaid >= input.tenureMonths) throw new HttpError(400, "alreadyPaid: that EMI is already finished");

  const rows = buildInstallments(
    { principal: input.principalPaise, annualRateBps: input.annualRateBps, tenureMonths: input.tenureMonths, gstOnInterestBps: input.gstOnInterestBps },
    input.firstDueOn,
  );
  const emi = await prisma.emi.create({
    data: {
      ...input,
      userId,
      principalPaise: BigInt(input.principalPaise),
      processingFeePaise: BigInt(input.processingFeePaise),
      firstDueOn: fromIsoDate(input.firstDueOn),
      installments: {
        create: rows.map((r) => ({ ...r, dueOn: fromIsoDate(r.dueOn), paidOn: r.number <= alreadyPaid ? fromIsoDate(r.dueOn) : null })),
      },
    },
    include: { installments: true },
  });
  return Response.json(emiDetailDto(emi, emi.installments), { status: 201 });
});
