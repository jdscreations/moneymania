import { analyzeCase, daysBetween, todayIn, type CaseDetailDto, type CaseDto, type EscalationStep } from "@moneymania/core";
import { prisma, type BankEmiRule, type CaseEvent, type Emi, type EmiInstallment, type Order, type PurchaseCase } from "@moneymania/db";
import { emiDto, termsOf } from "./emis";
import { HttpError, toIsoDate } from "./http";

type EmiWithRule = Emi & { installments: EmiInstallment[]; bankRule: BankEmiRule | null };
export type CaseRow = PurchaseCase & { orders: Order[]; emi: EmiWithRule | null };

export const caseInclude = {
  orders: { orderBy: { id: "asc" } },
  emi: { include: { installments: true, bankRule: true } },
} as const;

function analysis(c: CaseRow, today: string) {
  const emi = c.emi;
  if (!emi) return null;
  const rule = emi.bankRule;
  const dueDates = [...emi.installments].sort((a, b) => a.number - b.number).map((i) => toIsoDate(i.dueOn));
  return analyzeCase({
    terms: termsOf(emi),
    chargedOn: toIsoDate(c.chargedOn),
    dueDates,
    today,
    rule: {
      feeBps: emi.foreclosureFeeBps ?? rule?.foreclosureFeeBps ?? 0,
      gstBps: rule?.gstBps ?? 1800,
      cancelOnFullRefundOnly: rule?.cancelOnFullRefundOnly ?? true,
    },
    orders: c.orders.map((o) => ({
      amount: Number(o.amountPaise),
      status: o.status,
      refund: Number(o.refundPaise),
      refundPostedOn: o.refundPostedOn ? toIsoDate(o.refundPostedOn) : null,
    })),
    emiActive: emi.status === "active",
  });
}

export function caseDto(c: CaseRow, today = todayIn()): CaseDto {
  const deadline = c.disputeDeadlineOn ? toIsoDate(c.disputeDeadlineOn) : null;
  return {
    id: c.id,
    title: c.title,
    merchant: c.merchant,
    bankCode: c.emi?.bankRule?.bankCode ?? null,
    chargePaise: Number(c.chargePaise),
    chargedOn: toIsoDate(c.chargedOn),
    disputeDeadlineOn: deadline,
    disputeDaysLeft: deadline ? daysBetween(today, deadline) : null,
    status: c.status,
    emi: c.emi ? emiDto(c.emi, c.emi.installments) : null,
    analysis: analysis(c, today),
    orderCount: c.orders.length,
  };
}

const eventDto = (e: CaseEvent) => ({ id: e.id, on: toIsoDate(e.at), type: e.type, reference: e.reference, note: e.note });

export async function caseDetail(userId: string, id: string): Promise<CaseDetailDto> {
  const c = await prisma.purchaseCase.findFirst({
    where: { id, userId },
    include: { ...caseInclude, events: { orderBy: [{ at: "desc" }, { id: "desc" }] } },
  });
  if (!c) throw new HttpError(404, "Case not found");
  const contacts = c.emi?.bankRule?.escalationContacts;
  return {
    ...caseDto(c),
    orders: c.orders.map((o) => ({
      id: o.id,
      merchantOrderId: o.merchantOrderId,
      item: o.item,
      amountPaise: Number(o.amountPaise),
      status: o.status,
      refundPaise: Number(o.refundPaise),
      refundPostedOn: o.refundPostedOn ? toIsoDate(o.refundPostedOn) : null,
    })),
    events: c.events.map(eventDto),
    escalation: Array.isArray(contacts) ? (contacts as unknown as EscalationStep[]) : [],
  };
}

export async function ownCase(userId: string, id: string) {
  const c = await prisma.purchaseCase.findFirst({ where: { id, userId }, include: caseInclude });
  if (!c) throw new HttpError(404, "Case not found");
  return c;
}

export const logEvent = (caseId: string, type: CaseEvent["type"], note: string, reference?: string | null, at?: Date) =>
  prisma.caseEvent.create({ data: { caseId, type, note, reference: reference ?? null, ...(at ? { at } : {}) } });
