"use client";

import { rupeesToPaise, todayIn, type PrepaymentDto } from "@moneymania/core";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, cx, ErrorText, Input, Label, Money, Select } from "@/components/ui";
import { api, useLoad } from "@/lib/api";

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export default function EmiDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const emi = useLoad(() => api.emis.get(id), [id]);
  const accounts = useLoad(() => api.accounts.list(), []);
  const [payFrom, setPayFrom] = useState("");
  const [prepay, setPrepay] = useState("");
  const [mode, setMode] = useState<"reduce_tenure" | "reduce_emi">("reduce_tenure");
  const [whatIf, setWhatIf] = useState<PrepaymentDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const e = emi.data;
  if (!e) return <ErrorText>{emi.error}</ErrorText>;

  async function pay(number: number) {
    setError(null);
    try {
      await api.emis.payInstallment(id, number, { paidOn: todayIn(), accountId: payFrom || null });
      emi.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function runWhatIf(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    try {
      setWhatIf(await api.emis.prepayment(id, { amountPaise: rupeesToPaise(prepay), mode }));
    } catch (err) {
      setWhatIf(null);
      setError((err as Error).message);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${e!.name} and its schedule?`)) return;
    await api.emis.remove(id);
    router.replace("/emis");
  }

  const totalInterest = e.installments.reduce((s, i) => s + i.interestPaise + i.gstPaise, 0);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">{e.name}</h1>
          <p className="text-sm text-zinc-500">
            {e.lender} · <Money paise={e.principalPaise} /> at {(e.annualRateBps / 100).toFixed(2)}% for {e.tenureMonths} months
            {e.gstOnInterestBps > 0 && ` · ${e.gstOnInterestBps / 100}% GST on interest`}
          </p>
        </div>
        <Button variant="danger" onClick={remove}>Delete</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Monthly EMI", value: e.emiPaise },
          { label: "Principal left", value: e.outstandingPaise },
          { label: "Interest + GST left", value: e.remainingCostPaise },
          { label: "Total interest + GST", value: totalInterest },
        ].map((t) => (
          <Card key={t.label}>
            <p className="text-xs text-zinc-500">{t.label}</p>
            <p className="mt-1 text-lg font-semibold">
              <Money paise={t.value} />
            </p>
          </Card>
        ))}
      </div>

      {e.status === "active" && e.paidCount < e.tenureMonths - 1 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">What if I prepay?</h2>
          <form onSubmit={runWhatIf} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Label text="Prepay now (₹)">
              <Input inputMode="decimal" placeholder="10000" value={prepay} onChange={(ev) => setPrepay(ev.target.value)} required />
            </Label>
            <Label text="Then">
              <Select value={mode} onChange={(ev) => setMode(ev.target.value as typeof mode)}>
                <option value="reduce_tenure">Keep the EMI, finish sooner</option>
                <option value="reduce_emi">Keep the end date, lower the EMI</option>
              </Select>
            </Label>
            <div className="flex items-end">
              <Button variant="ghost" className="w-full">Calculate</Button>
            </div>
          </form>
          {whatIf && (
            <p className="mt-3 text-sm">
              You save <Money paise={whatIf.saved} tone="income" /> in interest and GST. EMI becomes <Money paise={whatIf.newEmi} /> for {whatIf.newRemainingMonths} more months. Bank prepayment or foreclosure fees are not included.
            </p>
          )}
        </Card>
      )}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Schedule</h2>
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            Log payments from
            <Select value={payFrom} onChange={(ev) => setPayFrom(ev.target.value)} className="w-auto py-1">
              <option value="">Don&apos;t log as spending</option>
              {accounts.data?.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </label>
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-zinc-500">
              <tr>
                <th className="py-1 pr-3">#</th>
                <th className="py-1 pr-3">Due</th>
                <th className="py-1 pr-3 text-right">Principal</th>
                <th className="py-1 pr-3 text-right">Interest</th>
                <th className="py-1 pr-3 text-right">GST</th>
                <th className="py-1 pr-3 text-right">Total</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {e.installments.map((i) => (
                <tr key={i.number} className={cx("border-t border-zinc-100 dark:border-zinc-900", i.paidOn && "text-zinc-400")}>
                  <td className="py-1.5 pr-3">{i.number}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{fmt(i.dueOn)}</td>
                  <td className="py-1.5 pr-3 text-right"><Money paise={i.principalPaise} /></td>
                  <td className="py-1.5 pr-3 text-right"><Money paise={i.interestPaise} /></td>
                  <td className="py-1.5 pr-3 text-right"><Money paise={i.gstPaise} /></td>
                  <td className="py-1.5 pr-3 text-right font-medium"><Money paise={i.emiPaise + i.gstPaise} /></td>
                  <td className="py-1.5 text-right">
                    {i.paidOn ? (
                      <span className="text-xs">Paid</span>
                    ) : e.status === "active" && i.number === e.nextDue?.number ? (
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => pay(i.number)}>Mark paid</Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
