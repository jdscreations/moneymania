import { roundHalfAway, type Bps, type Paise } from "./money";

const monthlyRate = (annualRateBps: Bps) => annualRateBps / 10_000 / 12;

export interface SavingsGoalInput {
  target: Paise;
  /** Already saved towards the goal. */
  saved: Paise;
  months: number;
  /** Expected yearly return on the savings (7% = 700); 0 for a plain account. */
  annualReturnBps: Bps;
}

export interface SavingsGoalResult {
  /** Amount to put away each month, at the start of the month, to reach the target. */
  monthly: Paise;
  /** What the money already saved grows to by the end. */
  savedGrowsTo: Paise;
  totalDeposits: Paise;
  /** Returns earned on the way: target minus everything put in. */
  growth: Paise;
}

/** Monthly saving needed to reach a target in `months`, with deposits at the start of each month. */
export function savingsGoal({ target, saved, months, annualReturnBps }: SavingsGoalInput): SavingsGoalResult {
  if (!Number.isInteger(months) || months < 1) throw new RangeError("months must be a whole number of at least 1");
  const r = monthlyRate(annualReturnBps);
  const growth = (1 + r) ** months;
  const savedGrowsTo = roundHalfAway(saved * growth);
  const gap = Math.max(0, target - savedGrowsTo);
  // Future value of an annuity due: P · ((1+r)^n − 1) / r · (1+r).
  const factor = r === 0 ? months : ((growth - 1) / r) * (1 + r);
  const monthly = gap === 0 ? 0 : Math.ceil(gap / factor);
  const totalDeposits = monthly * months;
  return { monthly, savedGrowsTo, totalDeposits, growth: Math.max(0, target - saved - totalDeposits) };
}

/** Months until `target` is reached saving `monthly` each month, or null if it never is within 50 years. */
export function monthsToGoal(target: Paise, saved: Paise, monthly: Paise, annualReturnBps: Bps): number | null {
  const r = monthlyRate(annualReturnBps);
  let balance = saved;
  for (let m = 0; m <= 600; m++) {
    if (balance >= target) return m;
    balance = (balance + monthly) * (1 + r);
  }
  return null;
}

export interface SipInput {
  monthly: Paise;
  annualReturnBps: Bps;
  years: number;
  /** Raise the monthly amount by this much each year (10% = 1000). Defaults to 0. */
  stepUpBps?: Bps;
}

export interface SipResult {
  invested: Paise;
  value: Paise;
  gains: Paise;
}

/** Value of a monthly SIP invested at the start of each month, compounding monthly. */
export function sipFutureValue({ monthly, annualReturnBps, years, stepUpBps = 0 }: SipInput): SipResult {
  if (!Number.isInteger(years) || years < 1) throw new RangeError("years must be a whole number of at least 1");
  const r = monthlyRate(annualReturnBps);
  let value = 0;
  let invested = 0;
  let amount = monthly;
  for (let m = 0; m < years * 12; m++) {
    if (m > 0 && m % 12 === 0) amount = roundHalfAway(amount * (1 + stepUpBps / 10_000));
    value = (value + amount) * (1 + r);
    invested += amount;
  }
  const rounded = roundHalfAway(value);
  return { invested, value: rounded, gains: rounded - invested };
}

export interface EmergencyFundInput {
  /** Typical monthly spending, including EMIs and bills. */
  monthlySpend: Paise;
  monthsOfCover: number;
  /** Cash and bank money that can be reached quickly. */
  available: Paise;
  /** Months to build up any shortfall. */
  buildMonths: number;
}

export interface EmergencyFundResult {
  target: Paise;
  shortfall: Paise;
  /** Share of the target already covered, in basis points (capped at 100%). */
  coveredBps: Bps;
  /** Months of spending the available money covers today. */
  monthsCovered: number;
  /** Monthly saving to close the shortfall in `buildMonths`. */
  monthly: Paise;
}

export function emergencyFund({ monthlySpend, monthsOfCover, available, buildMonths }: EmergencyFundInput): EmergencyFundResult {
  if (buildMonths < 1) throw new RangeError("buildMonths must be at least 1");
  const target = monthlySpend * monthsOfCover;
  const shortfall = Math.max(0, target - Math.max(0, available));
  return {
    target,
    shortfall,
    coveredBps: target === 0 ? 10_000 : Math.min(10_000, Math.round((Math.max(0, available) / target) * 10_000)),
    monthsCovered: monthlySpend === 0 ? 0 : Math.floor((Math.max(0, available) / monthlySpend) * 10) / 10,
    monthly: Math.ceil(shortfall / buildMonths),
  };
}
