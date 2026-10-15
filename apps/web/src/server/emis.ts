import { emiSchedule, installmentDueDates, monthlyEmi, type EmiDetailDto, type EmiDto, type EmiTerms, type InstallmentDto } from "@moneymania/core";
import { prisma, type Emi, type EmiInstallment } from "@moneymania/db";
import { HttpError, toIsoDate } from "./http";

export const termsOf = (e: Emi): EmiTerms => ({
  principal: Number(e.principalPaise),
  annualRateBps: e.annualRateBps,
  tenureMonths: e.tenureMonths,
  gstOnInterestBps: e.gstOnInterestBps,
});

/** Installment rows to store for a new EMI, built from the shared schedule math. */
export function buildInstallments(terms: EmiTerms, firstDueOn: string) {
  const dates = installmentDueDates(firstDueOn, terms.tenureMonths);
  return emiSchedule(terms).map((row, i) => ({
    number: row.number,
    dueOn: dates[i]!,
    principalPaise: BigInt(row.principal),
    interestPaise: BigInt(row.interest),
    gstPaise: BigInt(row.gst),
  }));
}

const installmentDto = (i: EmiInstallment): InstallmentDto => ({
  number: i.number,
  dueOn: toIsoDate(i.dueOn),
  emiPaise: Number(i.principalPaise + i.interestPaise),
  principalPaise: Number(i.principalPaise),
  interestPaise: Number(i.interestPaise),
  gstPaise: Number(i.gstPaise),
  paidOn: i.paidOn ? toIsoDate(i.paidOn) : null,
});

export function emiDto(e: Emi, installments: EmiInstallment[]): EmiDto {
  const sorted = [...installments].sort((a, b) => a.number - b.number);
  const unpaid = sorted.filter((i) => !i.paidOn);
  const next = e.status === "active" ? unpaid[0] : undefined;
  return {
    id: e.id,
    name: e.name,
    kind: e.kind,
    lender: e.lender,
    principalPaise: Number(e.principalPaise),
    annualRateBps: e.annualRateBps,
    tenureMonths: e.tenureMonths,
    firstDueOn: toIsoDate(e.firstDueOn),
    gstOnInterestBps: e.gstOnInterestBps,
    processingFeePaise: Number(e.processingFeePaise),
    accountId: e.accountId,
    remindDaysBefore: e.remindDaysBefore,
    status: e.status,
    emiPaise: monthlyEmi(termsOf(e)),
    paidCount: sorted.length - unpaid.length,
    outstandingPaise: Number(unpaid.reduce((s, i) => s + i.principalPaise, BigInt(0))),
    remainingCostPaise: Number(unpaid.reduce((s, i) => s + i.interestPaise + i.gstPaise, BigInt(0))),
    nextDue: next ? installmentDto(next) : null,
  };
}

export function emiDetailDto(e: Emi, installments: EmiInstallment[]): EmiDetailDto {
  return { ...emiDto(e, installments), installments: [...installments].sort((a, b) => a.number - b.number).map(installmentDto) };
}

export async function ownEmi(userId: string, id: string) {
  const emi = await prisma.emi.findFirst({ where: { id, userId }, include: { installments: true } });
  if (!emi) throw new HttpError(404, "EMI not found");
  return emi;
}
