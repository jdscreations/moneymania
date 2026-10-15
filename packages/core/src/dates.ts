/**
 * Calendar dates are plain "YYYY-MM-DD" strings in the user's local (IST) calendar.
 * Doing date math on these strings in UTC avoids timezone drift.
 */
export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function toUtc(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Today's date in a given IANA timezone (defaults to India). */
export function todayIn(timeZone = "Asia/Kolkata", now = new Date()): IsoDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type Period = "day" | "week" | "month";

/** Inclusive start and end of the period containing `date`. Weeks run Monday to Sunday. */
export function periodRange(period: Period, date: IsoDate): { from: IsoDate; to: IsoDate } {
  if (period === "day") return { from: date, to: date };
  if (period === "week") {
    const weekday = (toUtc(date).getUTCDay() + 6) % 7; // Monday = 0
    const from = addDays(date, -weekday);
    return { from, to: addDays(from, 6) };
  }
  const d = toUtc(date);
  const from = fromUtc(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  const to = fromUtc(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
  return { from, to };
}

/** Every date from `from` to `to`, inclusive. */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** "2026-10" for any date in October 2026. */
export function monthKey(date: IsoDate): string {
  return date.slice(0, 7);
}
