"use client";

import { emiKinds, monthlyEmi, rupeesToPaise, todayIn, type EmiInput } from "@moneymania/core";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, ErrorText, Input, Label, Money, Select } from "@/components/ui";
import { api, useLoad } from "@/lib/api";

const kindLabel: Record<(typeof emiKinds)[number], string> = {
  card_merchant: "Card EMI on a purchase",
  card_conversion: "Card bill converted to EMI",
  loan: "Loan",
  bnpl: "Buy now, pay later",
};

export default function Emis() {
  const emis = useLoad(() => api.emis.list(), []);
  const [form, setForm] = useState({ name: "", kind: "card_merchant" as EmiInput["kind"], lender: "", amount: "", rate: "", tenure: "12", firstDueOn: todayIn(), alreadyPaid: "0", gst: true });
  const [error, setError] = useState<string | null>(null);

  let preview: number | null = null;
  try {
    preview = form.amount && form.rate !== "" && Number(form.tenure) > 0 ? monthlyEmi({ principal: rupeesToPaise(form.amount), annualRateBps: Math.round(Number(form.rate) * 100), tenureMonths: Number(form.tenure) }) : null;
  } catch {
    preview = null;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.emis.create({
        name: form.name,
        kind: form.kind,
        lender: form.lender,
        principalPaise: rupeesToPaise(form.amount),
        annualRateBps: Math.round(Number(form.rate) * 100),
        tenureMonths: Number(form.tenure),
        firstDueOn: form.firstDueOn,
        alreadyPaid: Number(form.alreadyPaid) || 0,
        gstOnInterestBps: form.gst ? 1800 : 0,
      });
      setForm((f) => ({ ...f, name: "", amount: "", rate: "", lender: "" }));
      emis.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const active = emis.data?.filter((e) => e.status === "active") ?? [];
  const monthly = active.reduce((s, e) => s + (e.nextDue ? e.nextDue.emiPaise + e.nextDue.gstPaise : 0), 0);

  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">EMIs and loans</h1>
        <p className="text-sm text-zinc-500">
          <Money paise={monthly} /> due each month
        </p>
      </div>
      <Card>
        <ErrorText>{emis.error}</ErrorText>
        {emis.data?.length === 0 && <p className="text-sm text-zinc-500">No EMIs yet.</p>}
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {emis.data?.map((e) => (
            <li key={e.id}>
              <Link href={`/emis/${e.id}`} className="flex flex-wrap items-center gap-3 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <div className="min-w-40 flex-1">
                  <p className="font-medium">{e.name}</p>
                  <p className="text-xs text-zinc-500">
                    {e.lender} · {e.paidCount} of {e.tenureMonths} paid · {(e.annualRateBps / 100).toFixed(2)}%{e.status !== "active" && ` · ${e.status}`}
                  </p>
                </div>
                <div className="text-right">
                  <p>
                    <Money paise={e.emiPaise} /> <span className="text-xs text-zinc-500">/ month</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    <Money paise={e.outstandingPaise} /> left
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Add an EMI or loan</h2>
        <form onSubmit={add} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Label text="Name">
            <Input placeholder="Amazon order, bike loan…" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Label>
          <Label text="Type">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EmiInput["kind"] })}>
              {emiKinds.map((k) => (
                <option key={k} value={k}>{kindLabel[k]}</option>
              ))}
            </Select>
          </Label>
          <Label text="Bank or lender">
            <Input placeholder="SBI Card" value={form.lender} onChange={(e) => setForm({ ...form, lender: e.target.value })} required />
          </Label>
          <Label text="Amount converted (₹)">
            <Input inputMode="decimal" placeholder="58375.64" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </Label>
          <Label text="Interest rate (% a year)">
            <Input inputMode="decimal" placeholder="17" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required />
          </Label>
          <Label text="Months">
            <Input inputMode="numeric" value={form.tenure} onChange={(e) => setForm({ ...form, tenure: e.target.value })} required />
          </Label>
          <Label text="First EMI date">
            <Input type="date" value={form.firstDueOn} onChange={(e) => setForm({ ...form, firstDueOn: e.target.value })} required />
          </Label>
          <Label text="EMIs already paid">
            <Input inputMode="numeric" value={form.alreadyPaid} onChange={(e) => setForm({ ...form, alreadyPaid: e.target.value })} />
          </Label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.checked })} /> 18% GST on interest (credit cards)
          </label>
          <p className="text-sm text-zinc-600 sm:col-span-2 dark:text-zinc-400">{preview !== null && <>Monthly EMI about <Money paise={preview} /> before GST</>}</p>
          <div className="flex justify-end">
            <Button>Add EMI</Button>
          </div>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>
    </>
  );
}
