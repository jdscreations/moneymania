/**
 * All money in MoneyMania is an integer number of paise (1 rupee = 100 paise).
 * Never store or add rupee amounts as floats.
 */
export type Paise = number;

/** Basis points: 1 bp = 0.01%, so 17% = 1700 bps and 18% GST = 1800 bps. */
export type Bps = number;

export function assertPaise(value: number, label = "amount"): asserts value is Paise {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a whole number of paise, got ${value}`);
  }
}

/** Convert a rupee string such as "58,375.64" or "₹1,200" to paise without float error. */
export function rupeesToPaise(input: string | number): Paise {
  const text = String(input).replace(/[₹,\s]/g, "").replace(/^Rs\.?/i, "");
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new RangeError(`Not a rupee amount: ${input}`);
  const [, minus, whole, frac = ""] = match;
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return minus ? -paise : paise;
}

const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format paise in Indian grouping, e.g. 5837564 -> "₹58,375.64". */
export function formatINR(paise: Paise): string {
  assertPaise(paise);
  const sign = paise < 0 ? "-" : "";
  return `${sign}₹${inr.format(Math.abs(paise) / 100)}`;
}

/** Apply a basis-point rate to an amount, rounding half away from zero to the nearest paisa. */
export function applyBps(paise: Paise, bps: Bps): Paise {
  return roundHalfAway((paise * bps) / 10_000);
}

export function roundHalfAway(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}
