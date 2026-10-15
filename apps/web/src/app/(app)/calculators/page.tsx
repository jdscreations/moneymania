"use client";

import { emergencyFund, formatINR, monthsToGoal, rupeesToPaise, savingsGoal, sipFutureValue, summarizeEmi, type CalculatorContextDto } from "@moneymania/core";
import { useState } from "react";
import { Card, cx, Input, Label, Money } from "@/components/ui";
import { api, useLoad } from "@/lib/api";

const tabs = [
  { key: "emi", label: "EMI" },
  { key: "goal", label: "Savings goal" },
  { key: "sip", label: "SIP" },
  { key: "emergency", label: "Emergency fund" },
] as const;
type Tab = (typeof tabs)[number]["key"];

/** Paise from a rupee field, or null while it is empty or not a number yet. */
function paise(text: string): number | null {
  try {
    return text.trim() ? rupeesToPaise(text) : null;
  } catch {
    return null;
  }
}
const bps = (text: string) => (text.trim() === "" || Number.isNaN(Number(text)) ? null : Math.round(Number(text) * 100));
const whole = (text: string) => (/^\d+$/.test(text.trim()) && Number(text) > 0 ? Number(text) : null);
const asRupees = (p: number) => String(Math.round(p / 100));

function Result({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-900">{children}</div>;
}

function Big({ label, paise: p }: { label: string; paise: number }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-semibold"><Money paise={p} /></p>
    </div>
  );
}

function EmiCalc() {
  const [f, setF] = useState({ amount: "100000", rate: "15", months: "12", gst: true });
  const p = paise(f.amount);
  const r = bps(f.rate);
  const n = whole(f.months);
  const s = p && p > 0 && r !== null && n ? summarizeEmi({ principal: p, annualRateBps: r, tenureMonths: n, gstOnInterestBps: f.gst ? 1800 : 0 }) : null;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Label text="Amount (₹)"><Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Label>
        <Label text="Interest rate (% a year)"><Input inputMode="decimal" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Label>
        <Label text="Months"><Input inputMode="numeric" value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })} /></Label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.gst} onChange={(e) => setF({ ...f, gst: e.target.checked })} /> 18% GST on interest (credit card EMIs)
      </label>
      {s && (
        <Result>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Big label="Monthly EMI" paise={s.emi} />
            <Big label="Total interest" paise={s.totalInterest} />
            <Big label="GST on interest" paise={s.totalGst} />
            <Big label="Total you pay" paise={s.totalPaid} />
          </div>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Borrowing costs you {formatINR(s.totalInterest + s.totalGst)} on top of {formatINR(p!)}. Card EMIs may also charge a processing fee and interest for the days before your first statement.
          </p>
        </Result>
      )}
    </>
  );
}

function GoalCalc({ ctx }: { ctx: CalculatorContextDto | null }) {
  const [f, setF] = useState({ target: "200000", saved: "0", months: "24", rate: "7" });
  const t = paise(f.target);
  const s = paise(f.saved) ?? 0;
  const n = whole(f.months);
  const r = bps(f.rate) ?? 0;
  const res = t && n ? savingsGoal({ target: t, saved: s, months: n, annualReturnBps: r }) : null;
  const canSave = ctx && ctx.months > 0 ? ctx.avgMonthlyIncomePaise - ctx.avgMonthlySpendPaise : null;
  const atCurrent = t && canSave && canSave > 0 ? monthsToGoal(t, s, canSave, r) : null;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Label text="Goal (₹)"><Input inputMode="decimal" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></Label>
        <Label text="Already saved (₹)"><Input inputMode="decimal" value={f.saved} onChange={(e) => setF({ ...f, saved: e.target.value })} /></Label>
        <Label text="In how many months"><Input inputMode="numeric" value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })} /></Label>
        <Label text="Return (% a year)"><Input inputMode="decimal" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Label>
      </div>
      {res && (
        <Result>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Big label="Save each month" paise={res.monthly} />
            <Big label="You put in" paise={res.totalDeposits + s} />
            <Big label="Returns earned" paise={res.growth} />
          </div>
          {canSave !== null && (
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              {canSave > 0
                ? `You kept about ${formatINR(canSave)} a month over the last ${ctx!.months === 1 ? "month" : `${ctx!.months} months`}. ${
                    atCurrent !== null ? `Saving all of it reaches this goal in ${atCurrent} month${atCurrent === 1 ? "" : "s"}.` : ""
                  }`
                : `You spent more than you earned over the last ${ctx!.months === 1 ? "month" : `${ctx!.months} months`}, so this goal needs a cut in spending first.`}
            </p>
          )}
        </Result>
      )}
    </>
  );
}

function SipCalc({ ctx }: { ctx: CalculatorContextDto | null }) {
  const [f, setF] = useState({ monthly: "5000", rate: "12", years: "10", stepUp: "0" });
  const m = paise(f.monthly);
  const y = whole(f.years);
  const r = bps(f.rate);
  const res = m && m > 0 && y && r !== null ? sipFutureValue({ monthly: m, annualReturnBps: r, years: y, stepUpBps: bps(f.stepUp) ?? 0 }) : null;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Label text="Each month (₹)"><Input inputMode="decimal" value={f.monthly} onChange={(e) => setF({ ...f, monthly: e.target.value })} /></Label>
        <Label text="Expected return (% a year)"><Input inputMode="decimal" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Label>
        <Label text="Years"><Input inputMode="numeric" value={f.years} onChange={(e) => setF({ ...f, years: e.target.value })} /></Label>
        <Label text="Raise it each year by (%)"><Input inputMode="decimal" value={f.stepUp} onChange={(e) => setF({ ...f, stepUp: e.target.value })} /></Label>
      </div>
      {res && (
        <Result>
          <div className="grid grid-cols-3 gap-3">
            <Big label="You invest" paise={res.invested} />
            <Big label="Estimated value" paise={res.value} />
            <Big label="Estimated gains" paise={res.gains} />
          </div>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Returns are not guaranteed; this assumes the same return every year.
            {ctx && ctx.months > 0 && m && ctx.avgMonthlyIncomePaise > 0 && ` This SIP is ${Math.round((m / ctx.avgMonthlyIncomePaise) * 100)}% of your average monthly income.`}
          </p>
        </Result>
      )}
    </>
  );
}

/** Starts from the user's own numbers: average spending (or fixed outgo if nothing is logged) and liquid money. */
function EmergencyCalc({ ctx }: { ctx: CalculatorContextDto | null }) {
  const [f, setF] = useState(() => {
    const spend = ctx ? ctx.avgMonthlySpendPaise || ctx.emiMonthlyPaise + ctx.billsMonthlyPaise : 0;
    return { spend: spend ? asRupees(spend) : "", cover: "6", available: ctx ? asRupees(Math.max(0, ctx.liquidPaise)) : "", build: "12" };
  });
  const spend = paise(f.spend);
  const cover = whole(f.cover);
  const build = whole(f.build);
  const res = spend !== null && cover && build ? emergencyFund({ monthlySpend: spend, monthsOfCover: cover, available: paise(f.available) ?? 0, buildMonths: build }) : null;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Label text="Monthly spending (₹)"><Input inputMode="decimal" value={f.spend} onChange={(e) => setF({ ...f, spend: e.target.value })} /></Label>
        <Label text="Months to cover"><Input inputMode="numeric" value={f.cover} onChange={(e) => setF({ ...f, cover: e.target.value })} /></Label>
        <Label text="Money you can reach now (₹)"><Input inputMode="decimal" value={f.available} onChange={(e) => setF({ ...f, available: e.target.value })} /></Label>
        <Label text="Build the rest in (months)"><Input inputMode="numeric" value={f.build} onChange={(e) => setF({ ...f, build: e.target.value })} /></Label>
      </div>
      {ctx && (
        <p className="mt-2 text-xs text-zinc-500">
          Filled in from your last {ctx.months || "few"} month{ctx.months === 1 ? "" : "s"} of spending and your cash, bank, UPI and wallet balances. Your EMIs come to {formatINR(ctx.emiMonthlyPaise)} and bills to {formatINR(ctx.billsMonthlyPaise)} a month.
        </p>
      )}
      {res && (
        <Result>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Big label="Emergency fund target" paise={res.target} />
            <Big label="Still to save" paise={res.shortfall} />
            <Big label="Save each month" paise={res.monthly} />
            <div>
              <p className="text-xs text-zinc-500">Covered today</p>
              <p className="text-lg font-semibold">{res.monthsCovered} months</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full bg-emerald-600" style={{ width: `${res.coveredBps / 100}%` }} />
          </div>
        </Result>
      )}
    </>
  );
}

export default function Calculators() {
  const [tab, setTab] = useState<Tab>("emi");
  const ctx = useLoad(() => api.calculatorContext(), []);
  return (
    <>
      <h1 className="text-lg font-semibold">Calculators</h1>
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cx("rounded-lg px-3 py-1.5 text-sm whitespace-nowrap", tab === t.key ? "bg-emerald-600 font-medium text-white" : "border border-zinc-300 dark:border-zinc-700")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Card>
        {tab === "emi" && <EmiCalc />}
        {tab === "goal" && <GoalCalc ctx={ctx.data} />}
        {tab === "sip" && <SipCalc ctx={ctx.data} />}
        {tab === "emergency" && (ctx.data || ctx.error ? <EmergencyCalc ctx={ctx.data} /> : <p className="text-sm text-zinc-500">Loading your numbers…</p>)}
      </Card>
    </>
  );
}
