import { orderStatuses, type CaseAnalysis, type CaseVerdict, type OrderStatus } from "@moneymania/core";
import { cx } from "./ui";

export const orderStatusLabel: Record<OrderStatus, string> = {
  kept: "Kept",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  returned: "Returned",
};
export const orderStatusOptions = orderStatuses.map((s) => ({ value: s, label: orderStatusLabel[s] }));

const verdictTone: Record<CaseVerdict, string> = {
  cancel: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  foreclose: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  keep: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  closed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};
const verdictShort: Record<CaseVerdict, string> = { cancel: "Ask to cancel", foreclose: "Close early", keep: "Keep", closed: "Closed" };

export function VerdictChip({ analysis }: { analysis: CaseAnalysis | null }) {
  if (!analysis) return null;
  return <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", verdictTone[analysis.verdict])}>{verdictShort[analysis.verdict]}</span>;
}

export const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export function deadlineText(days: number | null, on: string | null) {
  if (days === null || !on) return "No dispute deadline set";
  if (days < 0) return `Dispute window closed on ${fmtDate(on)}`;
  if (days === 0) return "Last day to dispute is today";
  return `${days} day${days === 1 ? "" : "s"} left to dispute (until ${fmtDate(on)})`;
}
