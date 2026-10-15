import { orderStatuses, type CaseVerdict, type OrderStatus } from "@moneymania/core";

export const verdictShort: Record<CaseVerdict, string> = { cancel: "Ask the bank to cancel", foreclose: "Close early to save", keep: "Keep the EMI", closed: "EMI closed" };

export const orderStatusLabel: Record<OrderStatus, string> = { kept: "Kept", cancelled: "Cancelled", return_requested: "Return asked", returned: "Returned" };
export const orderStatusOptions = orderStatuses.map((s) => ({ value: s, label: orderStatusLabel[s] }));

export const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export function deadlineText(days: number | null, on: string | null) {
  if (days === null || !on) return "No dispute deadline set";
  if (days < 0) return `Dispute window closed on ${fmtDate(on)}`;
  if (days === 0) return "Last day to dispute is today";
  return `${days} day${days === 1 ? "" : "s"} left to dispute (until ${fmtDate(on)})`;
}
