"use client";

import { addDays, periodRange, todayIn, type Period } from "@moneymania/core";
import { useState } from "react";
import { EntryForm } from "@/components/entry-form";
import { Button, Card, cx, ErrorText, Money } from "@/components/ui";
import { Upcoming } from "@/components/upcoming";
import { api, useLoad } from "@/lib/api";

const step: Record<Period, number> = { day: 1, week: 7, month: 0 };

function shift(period: Period, date: string, dir: 1 | -1) {
  if (period !== "month") return addDays(date, step[period] * dir);
  const { from, to } = periodRange("month", date);
  return dir === 1 ? addDays(to, 1) : periodRange("month", addDays(from, -1)).from;
}

const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", ...opts });

function rangeLabel(period: Period, date: string) {
  const { from, to } = periodRange(period, date);
  if (period === "day") return from === todayIn() ? "Today" : fmtDate(from, { weekday: "short", day: "numeric", month: "short" });
  if (period === "month") return fmtDate(from, { month: "long", year: "numeric" });
  return `${fmtDate(from, { day: "numeric", month: "short" })} to ${fmtDate(to, { day: "numeric", month: "short" })}`;
}

export default function Today() {
  const [period, setPeriod] = useState<Period>("day");
  const [date, setDate] = useState(todayIn());
  const { from, to } = periodRange(period, date);

  const setup = useLoad(() => Promise.all([api.accounts.list(), api.categories.list()]), []);
  const summary = useLoad(() => api.summary(period, date), [period, date]);
  const entries = useLoad(() => api.transactions.list(from, to), [from, to]);

  const [accounts, categories] = setup.data ?? [[], []];
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const acctName = new Map(accounts.map((a) => [a.id, a.name]));
  const reloadAll = () => (summary.reload(), entries.reload(), setup.reload());

  async function startWithCash() {
    await api.accounts.create({ type: "cash", name: "Cash" });
    setup.reload();
  }

  async function remove(id: string) {
    await api.transactions.remove(id);
    reloadAll();
  }

  const s = summary.data;
  const maxCat = Math.max(1, ...(s?.expenseByCategory.map((c) => c.totalPaise) ?? [1]));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" aria-label="Previous" onClick={() => setDate(shift(period, date, -1))}>‹</Button>
          <h1 className="min-w-40 text-center text-lg font-semibold">{rangeLabel(period, date)}</h1>
          <Button variant="ghost" aria-label="Next" onClick={() => setDate(shift(period, date, 1))}>›</Button>
        </div>
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm dark:bg-zinc-900">
          {(["day", "week", "month"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={cx("rounded-md px-3 py-1 capitalize", period === p && "bg-white font-medium shadow-sm dark:bg-zinc-800")}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Earned", value: s?.incomePaise, tone: "income" as const },
          { label: "Spent", value: s?.expensePaise, tone: "expense" as const },
          { label: "Net", value: s?.netPaise, tone: "net" as const },
        ].map((t) => (
          <Card key={t.label}>
            <p className="text-xs text-zinc-500">{t.label}</p>
            <p className="mt-1 text-lg font-semibold sm:text-2xl">{t.value === undefined ? "…" : <Money paise={t.value} tone={t.tone} />}</p>
          </Card>
        ))}
      </div>

      <Card>
        {setup.data && accounts.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Add where your money sits first. A cash wallet is enough to begin.</p>
            <Button onClick={startWithCash}>Add a cash wallet</Button>
          </div>
        ) : setup.data ? (
          <EntryForm key={accounts.map((a) => a.id).join()} accounts={accounts} categories={categories} onSaved={reloadAll} />
        ) : null}
        <ErrorText>{setup.error}</ErrorText>
      </Card>

      <Upcoming />

      {s && s.expenseByCategory.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Where it went</h2>
          <ul className="flex flex-col gap-2">
            {s.expenseByCategory.map((c) => (
              <li key={c.categoryId ?? "none"} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate">{c.categoryId ? catName.get(c.categoryId) : "Uncategorized"}</span>
                <span className="h-2 rounded bg-rose-500/70" style={{ width: `${(Math.max(0, c.totalPaise) / maxCat) * 100}%` }} />
                <Money paise={c.totalPaise} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Entries</h2>
        <ErrorText>{entries.error}</ErrorText>
        {entries.data?.length === 0 && <p className="text-sm text-zinc-500">Nothing logged yet.</p>}
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {entries.data?.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-zinc-500">{fmtDate(t.occurredOn, { day: "numeric", month: "short" })}</span>
              <span className="flex-1 truncate">
                {t.kind === "transfer"
                  ? `${acctName.get(t.accountId) ?? "Account"} to ${acctName.get(t.transferAccountId ?? "") ?? "account"}`
                  : (t.categoryId ? catName.get(t.categoryId) : "Uncategorized")}
                {t.note && <span className="text-zinc-500"> · {t.note}</span>}
              </span>
              <Money paise={t.kind === "expense" ? -t.amountPaise : t.amountPaise} tone={t.kind === "transfer" ? undefined : t.kind === "expense" ? "expense" : "income"} />
              <button onClick={() => remove(t.id)} className="text-xs text-zinc-400 hover:text-red-600" aria-label="Delete entry">✕</button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
