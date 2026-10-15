"use client";

import { caseEventTypes, rupeesToPaise, todayIn, verdictCopy, type CaseEventInput, type CaseOrderDto, type OrderStatus } from "@moneymania/core";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { deadlineText, fmtDate, orderStatusOptions, VerdictChip } from "@/components/case-ui";
import { Button, Card, cx, ErrorText, Input, Money, Select } from "@/components/ui";
import { api, useLoad } from "@/lib/api";

const eventLabel: Record<(typeof caseEventTypes)[number], string> = {
  call: "Call",
  email: "Email",
  sr_number: "Service request",
  promise: "Promise made",
  escalation: "Escalation",
  note: "Note",
};

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useLoad(() => api.cases.get(id), [id]);
  const [event, setEvent] = useState({ type: "call" as CaseEventInput["type"], reference: "", note: "", on: todayIn() });
  const [error, setError] = useState<string | null>(null);

  const c = data.data;
  if (!c) return <ErrorText>{data.error}</ErrorText>;
  const a = c.analysis;
  const lender = c.emi?.lender ?? "the bank";
  const copy = a ? verdictCopy(a, lender) : null;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      data.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const updateOrder = (o: CaseOrderDto, patch: Parameters<typeof api.cases.updateOrder>[2]) => run(() => api.cases.updateOrder(id, o.id, patch));

  function changeStatus(o: CaseOrderDto, status: OrderStatus) {
    // Expect the full price back by default when an order is first cancelled or returned.
    const refundPaise = status === "kept" ? 0 : o.refundPaise || o.amountPaise;
    void updateOrder(o, { status, refundPaise, ...(status === "kept" ? { refundPostedOn: null } : {}) });
  }

  function editRefund(o: CaseOrderDto) {
    const text = prompt(`Refund for ${o.item} (₹)`, (o.refundPaise / 100).toFixed(2));
    if (text === null) return;
    try {
      void updateOrder(o, { refundPaise: rupeesToPaise(text) });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function addOrder() {
    const item = prompt("Item");
    if (!item) return;
    const price = prompt(`Price of ${item} (₹)`);
    if (!price) return;
    void run(() => api.cases.addOrder(id, { item, amountPaise: rupeesToPaise(price) }));
  }

  function closeEmi(outcome: "foreclosed" | "cancelled") {
    const q = outcome === "foreclosed" ? `Record that you closed the ${lender} EMI today?` : `Record that ${lender} cancelled the EMI today?`;
    if (confirm(q)) void run(() => api.cases.closeEmi(id, { outcome, on: todayIn() }));
  }

  async function remove() {
    if (!confirm(`Delete ${c!.title}, its orders, log and EMI schedule?`)) return;
    await api.cases.remove(id);
    router.replace("/refunds");
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    await run(() => api.cases.addEvent(id, { type: event.type, reference: event.reference || null, note: event.note || null, on: event.on }));
    setEvent((ev) => ({ ...ev, reference: "", note: "" }));
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            {c.title} <VerdictChip analysis={a} />
          </h1>
          <p className="text-sm text-zinc-500">
            <Money paise={c.chargePaise} /> charged on {fmtDate(c.chargedOn)}
            {c.emi && (
              <>
                {" "}· <Link className="underline" href={`/emis/${c.emi.id}`}>{lender} EMI</Link> at {(c.emi.annualRateBps / 100).toFixed(2)}% for {c.emi.tenureMonths} months
              </>
            )}
          </p>
          <p className={cx("text-sm", c.disputeDaysLeft !== null && c.disputeDaysLeft >= 0 && c.disputeDaysLeft <= 7 ? "font-medium text-amber-600" : "text-zinc-500")}>
            {deadlineText(c.disputeDaysLeft, c.disputeDeadlineOn)}
          </p>
        </div>
        <div className="flex gap-2">
          {c.status === "open" ? (
            <Button variant="ghost" onClick={() => run(() => api.cases.update(id, { status: "resolved" }))}>Mark resolved</Button>
          ) : (
            <Button variant="ghost" onClick={() => run(() => api.cases.update(id, { status: "open" }))}>Reopen</Button>
          )}
          <Button variant="danger" onClick={remove}>Delete</Button>
        </div>
      </div>
      <ErrorText>{error}</ErrorText>

      {a && copy && (
        <Card className={cx(a.verdict === "foreclose" && "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40")}>
          <p className="text-base font-semibold">{copy.headline}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{copy.detail}</p>
          {c.emi?.status === "active" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => closeEmi("foreclosed")}>I closed the EMI</Button>
              <Button variant="ghost" onClick={() => closeEmi("cancelled")}>The bank cancelled it</Button>
            </div>
          )}
        </Card>
      )}

      {a && a.verdict !== "closed" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <p className="text-xs text-zinc-500">Keep the EMI</p>
            <p className="mt-1 text-lg font-semibold"><Money paise={a.keepCost} /></p>
            <p className="text-xs text-zinc-500">interest and GST still to come</p>
          </Card>
          <Card>
            <p className="text-xs text-zinc-500">Close it today</p>
            <p className="mt-1 text-lg font-semibold"><Money paise={a.foreclosure.cost} /></p>
            <p className="text-xs text-zinc-500">+{" "}<Money paise={a.weeklyRise} /> each week</p>
          </Card>
          <Card>
            <p className="text-xs text-zinc-500">To pay the bank today</p>
            <p className="mt-1 text-lg font-semibold"><Money paise={a.foreclosure.payoff} /></p>
            <p className="text-xs text-zinc-500"><Money paise={a.outstanding} /> principal + costs</p>
          </Card>
          <Card>
            <p className="text-xs text-zinc-500">You kept</p>
            <p className="mt-1 text-lg font-semibold"><Money paise={a.keptValue} /></p>
            <p className="text-xs text-zinc-500">of <Money paise={a.ordersTotal} /> ordered</p>
          </Card>
        </div>
      )}

      {a && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold">How closing today adds up</h2>
          <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums sm:max-w-md">
            <dt className="text-zinc-500">Principal not yet billed</dt><dd className="text-right"><Money paise={a.outstanding} /></dd>
            <dt className="text-zinc-500">Foreclosure fee</dt><dd className="text-right"><Money paise={a.foreclosure.fee} /></dd>
            <dt className="text-zinc-500">GST on the fee</dt><dd className="text-right"><Money paise={a.foreclosure.feeGst} /></dd>
            <dt className="text-zinc-500">Interest since the last statement</dt><dd className="text-right"><Money paise={a.foreclosure.accruedInterest} /></dd>
            <dt className="text-zinc-500">GST on that interest</dt><dd className="text-right"><Money paise={a.foreclosure.accruedGst} /></dd>
            <dt className="font-medium">Total</dt><dd className="text-right font-medium"><Money paise={a.foreclosure.payoff} /></dd>
          </dl>
          <p className="mt-2 text-xs text-zinc-500">
            Refunds posted so far: <Money paise={a.refundPosted} />. Still on the way: <Money paise={a.refundPending} />. Refunds land on your card and can pay the closing amount. Check the exact figure with the bank before paying.
          </p>
        </Card>
      )}

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Orders</h2>
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={addOrder}>Add order</Button>
        </div>
        <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-900">
          {c.orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <div className="min-w-0 flex-1 basis-48">
                <p>{o.item}</p>
                {o.merchantOrderId && <p className="text-xs text-zinc-500">{o.merchantOrderId}</p>}
              </div>
              <span className="w-24 text-right tabular-nums"><Money paise={o.amountPaise} /></span>
              <Select aria-label={`Status of ${o.item}`} value={o.status} onChange={(e) => changeStatus(o, e.target.value as OrderStatus)} className="w-44 py-1">
                {orderStatusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
              <div className="flex w-56 items-center justify-end gap-2">
                {o.status === "kept" ? (
                  <span className="text-xs text-zinc-400">No refund</span>
                ) : (
                  <>
                    <button className="underline decoration-dotted" title="Change refund amount" onClick={() => editRefund(o)}>
                      <Money paise={o.refundPaise} />
                    </button>
                    {o.refundPostedOn ? (
                      <button className="text-xs text-emerald-700 dark:text-emerald-400" title="Click to undo" onClick={() => updateOrder(o, { refundPostedOn: null })}>
                        Posted {fmtDate(o.refundPostedOn)}
                      </button>
                    ) : (
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => updateOrder(o, { refundPostedOn: todayIn() })}>Mark posted</Button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[3fr_2fr]">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Case log</h2>
          <form onSubmit={addEvent} className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[auto_1fr_auto]">
            <Select aria-label="What happened" value={event.type} onChange={(e) => setEvent({ ...event, type: e.target.value as CaseEventInput["type"] })}>
              {caseEventTypes.map((t) => (
                <option key={t} value={t}>{eventLabel[t]}</option>
              ))}
            </Select>
            <Input aria-label="Reference" placeholder="Reference or request number" value={event.reference} onChange={(e) => setEvent({ ...event, reference: e.target.value })} />
            <Input aria-label="Date" type="date" value={event.on} onChange={(e) => setEvent({ ...event, on: e.target.value })} />
            <Input aria-label="Note" className="col-span-2" placeholder="What was said or promised" value={event.note} onChange={(e) => setEvent({ ...event, note: e.target.value })} />
            <Button className="col-span-2 sm:col-span-1">Add</Button>
          </form>
          <ol className="flex flex-col gap-3">
            {c.events.map((e) => (
              <li key={e.id} className="text-sm">
                <p className="text-xs text-zinc-500">
                  {fmtDate(e.on)} · {eventLabel[e.type]}
                  {e.reference && <span className="font-medium text-zinc-700 dark:text-zinc-300"> · {e.reference}</span>}
                </p>
                {e.note && <p>{e.note}</p>}
              </li>
            ))}
          </ol>
        </Card>
        {c.escalation.length > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold">If the bank says no</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
              {c.escalation.map((s) => (
                <li key={s.step}>
                  <p className="font-medium">{s.step}</p>
                  <p className="text-zinc-600 dark:text-zinc-400">{s.how}</p>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-zinc-500">Log each step above with its date and reference so you have the trail ready.</p>
          </Card>
        )}
      </div>
    </>
  );
}
