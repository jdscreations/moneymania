import { addMonths, type IsoDate } from "./dates";
import { applyBps, assertPaise, roundHalfAway, type Bps, type Paise } from "./money";

export interface EmiTerms {
  principal: Paise;
  /** Annual interest rate in basis points (17% = 1700). */
  annualRateBps: Bps;
  tenureMonths: number;
  /** GST charged on the interest part of each installment (18% = 1800). Defaults to 0. */
  gstOnInterestBps?: Bps;
}

export interface Installment {
  number: number;
  emi: Paise;
  principal: Paise;
  interest: Paise;
  gst: Paise;
  /** Total debited that month: emi + gst. */
  total: Paise;
  balanceAfter: Paise;
}

function validate({ principal, annualRateBps, tenureMonths }: EmiTerms) {
  assertPaise(principal, "principal");
  if (principal <= 0) throw new RangeError("principal must be positive");
  if (!Number.isInteger(tenureMonths) || tenureMonths < 1) {
    throw new RangeError("tenureMonths must be a whole number of at least 1");
  }
  if (annualRateBps < 0) throw new RangeError("annualRateBps cannot be negative");
}

/** Monthly installment on a reducing balance: P·r(1+r)^n / ((1+r)^n − 1), rounded to the paisa. */
export function monthlyEmi(terms: EmiTerms): Paise {
  validate(terms);
  const { principal, annualRateBps, tenureMonths } = terms;
  const r = annualRateBps / 10_000 / 12;
  if (r === 0) return Math.ceil(principal / tenureMonths);
  const growth = (1 + r) ** tenureMonths;
  return roundHalfAway((principal * r * growth) / (growth - 1));
}

/** Full repayment schedule. The last installment absorbs rounding so the balance ends at exactly 0. */
export function emiSchedule(terms: EmiTerms): Installment[] {
  const emi = monthlyEmi(terms);
  const r = terms.annualRateBps / 10_000 / 12;
  const gstBps = terms.gstOnInterestBps ?? 0;
  const rows: Installment[] = [];
  let balance = terms.principal;
  for (let n = 1; n <= terms.tenureMonths; n++) {
    const interest = roundHalfAway(balance * r);
    const isLast = n === terms.tenureMonths;
    const principalPart = isLast ? balance : Math.min(emi - interest, balance);
    const thisEmi = principalPart + interest;
    const gst = applyBps(interest, gstBps);
    balance -= principalPart;
    rows.push({
      number: n,
      emi: thisEmi,
      principal: principalPart,
      interest,
      gst,
      total: thisEmi + gst,
      balanceAfter: balance,
    });
  }
  return rows;
}

export interface EmiSummary {
  emi: Paise;
  totalInterest: Paise;
  totalGst: Paise;
  totalPaid: Paise;
}

export function summarizeEmi(terms: EmiTerms): EmiSummary {
  const rows = emiSchedule(terms);
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  const totalGst = rows.reduce((s, r) => s + r.gst, 0);
  return {
    emi: monthlyEmi(terms),
    totalInterest,
    totalGst,
    totalPaid: terms.principal + totalInterest + totalGst,
  };
}

/** Due date of each installment: the first on `firstDueOn`, then the same day each month. */
export function installmentDueDates(firstDueOn: IsoDate, tenureMonths: number): IsoDate[] {
  const anchor = Number(firstDueOn.slice(8, 10));
  return Array.from({ length: tenureMonths }, (_, i) => addMonths(firstDueOn, i, anchor));
}

export type PrepaymentMode = "reduce_tenure" | "reduce_emi";

export interface PrepaymentResult {
  /** Balance left after the prepayment. */
  balanceAfterPrepayment: Paise;
  newEmi: Paise;
  /** Installments left after the prepayment. */
  newRemainingMonths: number;
  /** Interest (plus GST on it) still to pay without and with the prepayment. */
  remainingCostBefore: Paise;
  remainingCostAfter: Paise;
  saved: Paise;
}

/** Interest plus GST still to pay on the rows after `paidCount` installments. */
function remainingCost(rows: Installment[], paidCount: number): Paise {
  return rows.slice(paidCount).reduce((s, r) => s + r.interest + r.gst, 0);
}

/**
 * What a part-prepayment right after installment `paidCount` saves. "reduce_tenure" keeps the EMI and
 * finishes sooner; "reduce_emi" keeps the end date and lowers the EMI. Prepayment fees are not included.
 */
export function prepaymentWhatIf(terms: EmiTerms, paidCount: number, prepayment: Paise, mode: PrepaymentMode): PrepaymentResult {
  assertPaise(prepayment, "prepayment");
  const rows = emiSchedule(terms);
  if (!Number.isInteger(paidCount) || paidCount < 0 || paidCount >= terms.tenureMonths) {
    throw new RangeError("paidCount must be between 0 and tenureMonths - 1");
  }
  const balance = paidCount === 0 ? terms.principal : rows[paidCount - 1]!.balanceAfter;
  if (prepayment <= 0 || prepayment >= balance) throw new RangeError("prepayment must be more than 0 and less than the balance");

  const left = balance - prepayment;
  const monthsLeft = terms.tenureMonths - paidCount;
  const before = remainingCost(rows, paidCount);
  const emi = monthlyEmi(terms);

  let after: Installment[];
  if (mode === "reduce_emi") {
    after = emiSchedule({ ...terms, principal: left, tenureMonths: monthsLeft });
  } else {
    // Find the shortest tenure whose EMI does not exceed the current EMI.
    let n = 1;
    while (n < monthsLeft && monthlyEmi({ ...terms, principal: left, tenureMonths: n }) > emi) n++;
    after = emiSchedule({ ...terms, principal: left, tenureMonths: n });
  }
  const afterCost = remainingCost(after, 0);
  return {
    balanceAfterPrepayment: left,
    newEmi: after[0]!.emi,
    newRemainingMonths: after.length,
    remainingCostBefore: before,
    remainingCostAfter: afterCost,
    saved: before - afterCost,
  };
}
