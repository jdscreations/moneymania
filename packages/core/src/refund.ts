import { addDays, daysBetween, type IsoDate } from "./dates";
import { emiSchedule, interestForDays, type EmiTerms } from "./emi";
import { applyBps, formatINR, type Bps, type Paise } from "./money";

export const orderStatuses = ["kept", "cancelled", "return_requested", "returned"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export interface CaseOrder {
  amount: Paise;
  status: OrderStatus;
  /** Refund expected or received for this order. */
  refund: Paise;
  /** Date the refund reached the card statement; null while it is still on its way. */
  refundPostedOn: IsoDate | null;
}

export interface ForeclosureRule {
  /** Fee on the outstanding principal (SBI Card: 3% = 300). */
  feeBps: Bps;
  /** GST on the fee and on interest (18% = 1800). */
  gstBps: Bps;
  /** Banks such as SBI cancel a merchant EMI only when the whole purchase is refunded. */
  cancelOnFullRefundOnly: boolean;
}

export interface CaseAnalysisInput {
  terms: EmiTerms;
  /** Date of the card charge that was converted to EMI. */
  chargedOn: IsoDate;
  /** Statement date that bills each installment, in order. */
  dueDates: IsoDate[];
  today: IsoDate;
  rule: ForeclosureRule;
  orders: CaseOrder[];
  emiActive: boolean;
}

export type CaseVerdict = "cancel" | "foreclose" | "keep" | "closed";

export interface CaseAnalysis {
  /** Installments already billed on a statement; their interest is spent. */
  billedCount: number;
  /** Principal not yet billed, which is what a foreclosure pays off. */
  outstanding: Paise;
  /** Interest plus GST over the whole EMI. */
  lifetimeCost: Paise;
  /** Interest plus GST still to be billed if the EMI runs its course. */
  keepCost: Paise;
  foreclosure: {
    fee: Paise;
    feeGst: Paise;
    /** Interest since the last statement (or since the purchase, before the first statement). */
    accruedInterest: Paise;
    accruedGst: Paise;
    /** Fee, interest and GST on top of the outstanding principal. */
    cost: Paise;
    /** Amount to pay the bank to close the EMI today. */
    payoff: Paise;
  };
  /** keepCost minus the foreclosure cost; positive when foreclosing today is cheaper. */
  saving: Paise;
  /** How much the foreclosure cost grows each week until the next statement. */
  weeklyRise: Paise;
  ordersTotal: Paise;
  /** Value of the orders that were kept. */
  keptValue: Paise;
  refundPosted: Paise;
  refundPending: Paise;
  fullyRefunded: boolean;
  verdict: CaseVerdict;
}

/** Keep-or-foreclose numbers for a card EMI whose orders were partly cancelled or returned. */
export function analyzeCase(input: CaseAnalysisInput): CaseAnalysis {
  const { terms, dueDates, today, rule, orders } = input;
  const rows = emiSchedule(terms);
  const billedCount = dueDates.filter((d) => d <= today).length;
  const outstanding = billedCount === 0 ? terms.principal : rows[billedCount - 1]!.balanceAfter;
  const lifetimeCost = rows.reduce((s, r) => s + r.interest + r.gst, 0);
  const keepCost = rows.slice(billedCount).reduce((s, r) => s + r.interest + r.gst, 0);

  const lastStatement = billedCount === 0 ? input.chargedOn : dueDates[billedCount - 1]!;
  const accruedDays = Math.max(0, daysBetween(lastStatement, today));
  const fee = outstanding > 0 ? applyBps(outstanding, rule.feeBps) : 0;
  const feeGst = applyBps(fee, rule.gstBps);
  const accruedInterest = interestForDays(outstanding, terms.annualRateBps, accruedDays);
  const accruedGst = applyBps(accruedInterest, rule.gstBps);
  const cost = fee + feeGst + accruedInterest + accruedGst;
  const weekly = interestForDays(outstanding, terms.annualRateBps, 7);

  const ordersTotal = orders.reduce((s, o) => s + o.amount, 0);
  const keptValue = orders.filter((o) => o.status === "kept").reduce((s, o) => s + o.amount, 0);
  const refunds = orders.filter((o) => o.status !== "kept");
  const refundPosted = refunds.filter((o) => o.refundPostedOn).reduce((s, o) => s + o.refund, 0);
  const refundPending = refunds.filter((o) => !o.refundPostedOn).reduce((s, o) => s + o.refund, 0);
  const fullyRefunded = orders.length > 0 && refunds.length === orders.length;
  const saving = keepCost - cost;

  let verdict: CaseVerdict;
  if (!input.emiActive || outstanding === 0) verdict = "closed";
  else if (fullyRefunded && rule.cancelOnFullRefundOnly) verdict = "cancel";
  else if (refundPosted + refundPending > 0 && saving > 0) verdict = "foreclose";
  else verdict = "keep";

  return {
    billedCount,
    outstanding,
    lifetimeCost,
    keepCost,
    foreclosure: { fee, feeGst, accruedInterest, accruedGst, cost, payoff: outstanding + cost },
    saving,
    weeklyRise: weekly + applyBps(weekly, rule.gstBps),
    ordersTotal,
    keptValue,
    refundPosted,
    refundPending,
    fullyRefunded,
    verdict,
  };
}

/** Last day to raise a dispute with the bank, counted from the charge date. */
export function disputeDeadline(chargedOn: IsoDate, windowDays: number): IsoDate {
  return addDays(chargedOn, windowDays);
}

/** One-line verdict and its reason, shared by the web and mobile apps. */
export function verdictCopy(a: CaseAnalysis, lender = "the bank"): { headline: string; detail: string } {
  const f = a.foreclosure;
  switch (a.verdict) {
    case "cancel":
      return {
        headline: "Ask the bank to cancel this EMI",
        detail: `Every order was refunded. ${lender} cancels a merchant EMI on a full refund, so ask for the EMI to be cancelled and the interest and fees reversed.`,
      };
    case "foreclose":
      return {
        headline: `Close the EMI early to save ${formatINR(a.saving)}`,
        detail: `Keeping it costs ${formatINR(a.keepCost)} more in interest and GST. Closing it today costs ${formatINR(f.cost)} in fees, interest and GST, and that grows about ${formatINR(a.weeklyRise)} a week until the next statement.`,
      };
    case "keep":
      return {
        headline: "Keeping the EMI is cheaper for now",
        detail: `Closing it today would cost ${formatINR(f.cost)}, against ${formatINR(a.keepCost)} of interest and GST still to come.`,
      };
    case "closed":
      return { headline: "This EMI is closed", detail: "Nothing more is owed on it." };
  }
}
