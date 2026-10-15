"use client";

import Link from "next/link";
import { api, useLoad } from "@/lib/api";
import { Card, cx, Money } from "./ui";

export const dueLabel = (days: number) => (days < 0 ? `${-days}d overdue` : days === 0 ? "Due today" : days === 1 ? "Tomorrow" : `In ${days} days`);

/** Bills, EMIs and dispute deadlines in the next two weeks, overdue first. */
export function Upcoming() {
  const { data } = useLoad(() => api.upcoming(14), []);
  if (!data || data.length === 0) return null;
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">Coming up</h2>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
        {data.map((u) => (
          <li key={`${u.type}-${u.id}-${u.dueOn}`} className="flex items-center gap-3 py-2 text-sm">
            <span className={cx("w-24 shrink-0 text-xs", u.daysLeft < 0 ? "font-medium text-rose-600" : u.daysLeft <= 2 ? "text-amber-600" : "text-zinc-500")}>{dueLabel(u.daysLeft)}</span>
            <Link href={u.type === "bill" ? "/bills" : u.type === "dispute" ? `/refunds/${u.id}` : `/emis/${u.id}`} className="flex-1 truncate hover:underline">
              {u.name}
              {u.autopay && <span className="text-xs text-zinc-500"> · autopay</span>}
            </Link>
            {u.type !== "dispute" && <Money paise={u.amountPaise} />}
          </li>
        ))}
      </ul>
    </Card>
  );
}
