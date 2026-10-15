"use client";

import { billFrequencies, daysBetween, rupeesToPaise, todayIn, type BillFrequency, type BillDto } from "@moneymania/core";
import { useState } from "react";
import { dueLabel } from "@/components/upcoming";
import { Button, Card, ErrorText, Input, Label, Money, Select } from "@/components/ui";
import { api, useLoad } from "@/lib/api";

const freqLabel: Record<BillFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Every 3 months",
  half_yearly: "Every 6 months",
  yearly: "Yearly",
  once: "One time",
};

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export default function Bills() {
  const bills = useLoad(() => api.bills.list(), []);
  const setup = useLoad(() => Promise.all([api.accounts.list(), api.categories.list()]), []);
  const [accounts, categories] = setup.data ?? [[], []];
  const [form, setForm] = useState({ name: "", amount: "", frequency: "monthly" as BillFrequency, nextDueOn: todayIn(), categoryId: "cat_utilities", accountId: "", autopay: false });
  const [error, setError] = useState<string | null>(null);
  const today = todayIn();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.bills.create({
        name: form.name,
        amountPaise: rupeesToPaise(form.amount),
        frequency: form.frequency,
        nextDueOn: form.nextDueOn,
        categoryId: form.categoryId || null,
        accountId: form.accountId || null,
        autopay: form.autopay,
      });
      setForm((f) => ({ ...f, name: "", amount: "" }));
      bills.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function pay(b: BillDto) {
    const accountId = b.accountId ?? accounts[0]?.id ?? null;
    await api.bills.pay(b.id, { accountId, paidOn: today });
    bills.reload();
  }

  async function remove(b: BillDto) {
    if (!confirm(`Stop tracking ${b.name}?`)) return;
    await api.bills.remove(b.id);
    bills.reload();
  }

  const active = bills.data?.filter((b) => b.nextDueOn) ?? [];
  const monthly = active.reduce((s, b) => s + ({ weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, half_yearly: 1 / 6, yearly: 1 / 12, once: 0 }[b.frequency] * b.amountPaise), 0);

  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Bills</h1>
        <p className="text-sm text-zinc-500">
          About <Money paise={Math.round(monthly)} /> a month
        </p>
      </div>
      <Card>
        <ErrorText>{bills.error}</ErrorText>
        {bills.data?.length === 0 && <p className="text-sm text-zinc-500">No bills yet. Add rent, electricity, phone, insurance and subscriptions below.</p>}
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {bills.data?.map((b) => {
            const days = b.nextDueOn ? daysBetween(today, b.nextDueOn) : null;
            return (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-40 flex-1">
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-zinc-500">
                    {freqLabel[b.frequency]}
                    {b.autopay && " · autopay"}
                    {b.nextDueOn ? ` · next ${fmt(b.nextDueOn)} (${dueLabel(days!)})` : " · done"}
                  </p>
                </div>
                <Money paise={b.amountPaise} />
                {b.nextDueOn && (
                  <Button variant="ghost" onClick={() => pay(b)}>
                    Mark paid
                  </Button>
                )}
                <button onClick={() => remove(b)} className="text-xs text-zinc-400 hover:text-red-600" aria-label={`Remove ${b.name}`}>✕</button>
              </li>
            );
          })}
        </ul>
        {active.length > 0 && <p className="mt-2 text-xs text-zinc-500">Mark paid logs the spend from the bill&apos;s account (or your first account) and moves it to the next due date.</p>}
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Add a bill</h2>
        <form onSubmit={add} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Label text="Name">
            <Input placeholder="Electricity" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Label>
          <Label text="Amount (₹)">
            <Input inputMode="decimal" placeholder="1800" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </Label>
          <Label text="Repeats">
            <Select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as BillFrequency })}>
              {billFrequencies.map((f) => (
                <option key={f} value={f}>{freqLabel[f]}</option>
              ))}
            </Select>
          </Label>
          <Label text="Next due">
            <Input type="date" value={form.nextDueOn} onChange={(e) => setForm({ ...form, nextDueOn: e.target.value })} required />
          </Label>
          <Label text="Category">
            <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Uncategorized</option>
              {categories.filter((c) => c.kind === "expense").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Label>
          <Label text="Paid from">
            <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">Choose when paying</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.autopay} onChange={(e) => setForm({ ...form, autopay: e.target.checked })} /> Paid automatically (autopay)
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <Button>Add bill</Button>
          </div>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>
    </>
  );
}
