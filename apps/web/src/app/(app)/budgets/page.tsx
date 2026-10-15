"use client";

import { addDays, periodRange, rupeesToPaise, todayIn } from "@moneymania/core";
import { useState } from "react";
import { Button, Card, cx, ErrorText, Input, Label, Money, Select } from "@/components/ui";
import { api, useLoad } from "@/lib/api";

export default function Budgets() {
  const [month, setMonth] = useState(todayIn().slice(0, 7));
  const budgets = useLoad(() => api.budgets.list(month), [month]);
  const categories = useLoad(() => api.categories.list(), []);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const spending = categories.data?.filter((c) => c.kind === "expense") ?? [];
  const name = new Map(spending.map((c) => [c.id, c.name]));
  const { from } = periodRange("month", `${month}-01`);
  const label = new Date(`${from}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
  const move = (dir: 1 | -1) => setMonth((dir === 1 ? addDays(periodRange("month", from).to, 1) : periodRange("month", addDays(from, -1)).from).slice(0, 7));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.budgets.set({ categoryId, month, limitPaise: rupeesToPaise(limit) });
      setLimit("");
      budgets.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    await api.budgets.remove(id);
    budgets.reload();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" aria-label="Previous month" onClick={() => move(-1)}>‹</Button>
        <h1 className="min-w-40 text-center text-lg font-semibold">Budgets · {label}</h1>
        <Button variant="ghost" aria-label="Next month" onClick={() => move(1)}>›</Button>
      </div>
      <Card>
        <ErrorText>{budgets.error}</ErrorText>
        {budgets.data?.length === 0 && <p className="text-sm text-zinc-500">No budgets for this month yet.</p>}
        <ul className="flex flex-col gap-4">
          {budgets.data?.map((b) => {
            const used = b.spentPaise / b.limitPaise;
            return (
              <li key={b.id} className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-3">
                  <span className="flex-1 font-medium">{name.get(b.categoryId) ?? "Category"}</span>
                  <span className="text-zinc-500">
                    <Money paise={b.spentPaise} /> of <Money paise={b.limitPaise} />
                  </span>
                  <button onClick={() => remove(b.id)} className="text-xs text-zinc-400 hover:text-red-600" aria-label="Remove budget">✕</button>
                </div>
                <div className="h-2 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                  <div className={cx("h-full", used > 1 ? "bg-rose-500" : used > 0.8 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, used * 100)}%` }} />
                </div>
                {used > 1 && <p className="text-xs text-rose-600">Over by <Money paise={b.spentPaise - b.limitPaise} /></p>}
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Set a budget</h2>
        <form onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Label text="Category">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Choose…</option>
              {spending.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Label>
          <Label text="Monthly limit (₹)">
            <Input inputMode="decimal" placeholder="5000" value={limit} onChange={(e) => setLimit(e.target.value)} required />
          </Label>
          <div className="flex items-end">
            <Button className="w-full">Save budget</Button>
          </div>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>
    </>
  );
}
