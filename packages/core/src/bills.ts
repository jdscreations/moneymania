import { addDays, addMonths, type IsoDate } from "./dates";

export const billFrequencies = ["weekly", "monthly", "quarterly", "half_yearly", "yearly", "once"] as const;
export type BillFrequency = (typeof billFrequencies)[number];

const monthsPer: Record<Exclude<BillFrequency, "weekly" | "once">, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
};

/**
 * The due date after `due` for a recurring bill, or null for a one-time bill.
 * `anchorDay` is the bill's usual day of month, so a bill on the 31st returns to the 31st after February.
 */
export function nextBillDue(frequency: BillFrequency, due: IsoDate, anchorDay?: number): IsoDate | null {
  if (frequency === "once") return null;
  if (frequency === "weekly") return addDays(due, 7);
  return addMonths(due, monthsPer[frequency], anchorDay);
}
