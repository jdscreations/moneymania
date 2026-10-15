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
