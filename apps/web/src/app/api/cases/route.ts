import { caseInput, daysBetween, disputeDeadline, formatINR } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { caseDetail, caseDto, caseInclude } from "@/server/cases";
import { buildInstallments } from "@/server/emis";
import { fromIsoDate, handle, HttpError, parseBody, requireUserId } from "@/server/http";
import { ownAccount } from "@/server/ledger";

const merchantName = { amazon_in: "Amazon", flipkart: "Flipkart", other: "Online" } as const;

export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const cases = await prisma.purchaseCase.findMany({ where: { userId }, include: caseInclude, orderBy: { chargedOn: "desc" } });
  return Response.json(cases.map((c) => caseDto(c)));
});

/** Opens a case: the card charge, the EMI it was converted to (with its schedule) and the orders inside it. */
export const POST = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const input = await parseBody(req, caseInput);
  if (input.accountId) await ownAccount(userId, input.accountId);

  const bankCode = input.bankCode.toLowerCase();
  const rule = await prisma.bankEmiRule.findUnique({ where: { bankCode_emiKind: { bankCode, emiKind: "card_merchant" } } });
  const feeBps = input.foreclosureFeeBps ?? rule?.foreclosureFeeBps;
  if (feeBps == null) throw new HttpError(400, "foreclosureFeeBps: enter your bank's fee for closing the EMI early");
  const windowDays = input.disputeWindowDays ?? rule?.disputeWindowDays ?? null;

  const terms = {
    principal: input.chargePaise,
    annualRateBps: input.annualRateBps,
    tenureMonths: input.tenureMonths,
    gstOnInterestBps: input.gstOnInterestBps,
    brokenPeriodDays: daysBetween(input.chargedOn, input.firstStatementOn),
  };
  const rows = buildInstallments(terms, input.firstStatementOn);
  const title = input.title || `${merchantName[input.merchant]} order on EMI`;
  const lender = input.lender ?? (bankCode === "sbi" ? "SBI Card" : input.bankCode.toUpperCase());

  const created = await prisma.$transaction(async (tx) => {
    const emi = await tx.emi.create({
      data: {
        userId,
        accountId: input.accountId ?? null,
        kind: "card_merchant",
        name: title,
        lender,
        principalPaise: BigInt(input.chargePaise),
        annualRateBps: input.annualRateBps,
        tenureMonths: input.tenureMonths,
        firstDueOn: fromIsoDate(input.firstStatementOn),
        gstOnInterestBps: input.gstOnInterestBps,
        processingFeePaise: BigInt(input.processingFeePaise),
        brokenPeriodDays: terms.brokenPeriodDays,
        foreclosureFeeBps: feeBps,
        bankRuleId: rule?.id ?? null,
        installments: { create: rows.map((r) => ({ ...r, dueOn: fromIsoDate(r.dueOn) })) },
      },
    });
    return tx.purchaseCase.create({
      data: {
        userId,
        emiId: emi.id,
        title,
        merchant: input.merchant,
        chargePaise: BigInt(input.chargePaise),
        chargedOn: fromIsoDate(input.chargedOn),
        disputeDeadlineOn: windowDays ? fromIsoDate(disputeDeadline(input.chargedOn, windowDays)) : null,
        orders: {
          create: input.orders.map((o) => ({
            merchantOrderId: o.merchantOrderId ?? null,
            item: o.item,
            amountPaise: BigInt(o.amountPaise),
            status: o.status,
            refundPaise: BigInt(o.refundPaise),
            refundPostedOn: o.refundPostedOn ? fromIsoDate(o.refundPostedOn) : null,
          })),
        },
        events: {
          create: {
            type: "note",
            note: `Case opened: ${formatINR(input.chargePaise)} on ${lender} EMI, ${input.orders.length} order${input.orders.length === 1 ? "" : "s"}.`,
            at: fromIsoDate(input.chargedOn),
          },
        },
      },
    });
  });
  return Response.json(await caseDetail(userId, created.id), { status: 201 });
});
