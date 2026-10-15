"use client";

import { addDays, merchants, rupeesToPaise, todayIn, type CaseInput, type OrderStatus } from "@moneymania/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deadlineText, orderStatusOptions, VerdictChip } from "@/components/case-ui";
import { Button, Card, cx, ErrorText, Input, Label, Money, Select } from "@/components/ui";
import { api, useLoad } from "@/lib/api";

const merchantLabel: Record<(typeof merchants)[number], string> = { amazon_in: "Amazon.in", flipkart: "Flipkart", other: "Other store" };

interface OrderRow {
  item: string;
  merchantOrderId: string;
  price: string;
  status: OrderStatus;
  refund: string;
}
const emptyOrder = (): OrderRow => ({ item: "", merchantOrderId: "", price: "", status: "kept", refund: "" });

export default function Refunds() {
  const router = useRouter();
  const cases = useLoad(() => api.cases.list(), []);
  const accounts = useLoad(() => api.accounts.list(), []);
  const today = todayIn();
  const [form, setForm] = useState({
    title: "",
    merchant: "amazon_in" as CaseInput["merchant"],
    bank: "sbi",
    otherBank: "",
    feePct: "3",
    disputeDays: "45",
    accountId: "",
    charge: "",
    chargedOn: today,
    firstStatementOn: addDays(today, 18),
    rate: "",
    tenure: "12",
    processingFee: "",
  });
  const [orders, setOrders] = useState<OrderRow[]>([emptyOrder()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setOrder = (i: number, patch: Partial<OrderRow>) => setOrders((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function open(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const other = form.bank === "other";
      const created = await api.cases.create({
        title: form.title,
        merchant: form.merchant,
        bankCode: other ? form.otherBank.trim() || "other" : "sbi",
        accountId: form.accountId || null,
        chargePaise: rupeesToPaise(form.charge),
        chargedOn: form.chargedOn,
        firstStatementOn: form.firstStatementOn,
        annualRateBps: Math.round(Number(form.rate) * 100),
        tenureMonths: Number(form.tenure),
        processingFeePaise: form.processingFee ? rupeesToPaise(form.processingFee) : 0,
        foreclosureFeeBps: other ? Math.round(Number(form.feePct) * 100) : undefined,
        disputeWindowDays: other && form.disputeDays ? Number(form.disputeDays) : undefined,
        orders: orders
          .filter((o) => o.item.trim())
          .map((o) => ({
            item: o.item,
            merchantOrderId: o.merchantOrderId || null,
            amountPaise: rupeesToPaise(o.price),
            status: o.status,
            refundPaise: o.status === "kept" ? 0 : o.refund ? rupeesToPaise(o.refund) : rupeesToPaise(o.price),
          })),
      });
      router.push(`/refunds/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Refunds on EMI purchases</h1>
        <p className="text-sm text-zinc-500">When part of a card EMI purchase is cancelled or returned, see whether to keep the EMI or close it, and track every refund and call.</p>
      </div>

      <Card>
        <ErrorText>{cases.error}</ErrorText>
        {cases.data?.length === 0 && <p className="text-sm text-zinc-500">No cases yet. Open one below for an order you paid on card EMI.</p>}
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {cases.data?.map((c) => (
            <li key={c.id}>
              <Link href={`/refunds/${c.id}`} className="flex flex-wrap items-center gap-3 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <div className="min-w-48 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {c.title} <VerdictChip analysis={c.analysis} />
                    {c.status === "resolved" && <span className="text-xs font-normal text-zinc-500">Resolved</span>}
                  </p>
                  <p className="text-xs text-zinc-500">
                    <Money paise={c.chargePaise} /> on {c.emi?.lender ?? "card"} · {c.orderCount} order{c.orderCount === 1 ? "" : "s"} · {deadlineText(c.disputeDaysLeft, c.disputeDeadlineOn)}
                  </p>
                </div>
                {c.analysis && c.analysis.verdict !== "closed" && (
                  <div className="text-right text-xs text-zinc-500">
                    <p>
                      Keep: <Money paise={c.analysis.keepCost} />
                    </p>
                    <p>
                      Close today: <Money paise={c.analysis.foreclosure.cost} />
                    </p>
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Open a case</h2>
        <form onSubmit={open} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Label text="Name">
              <Input placeholder="Festival sale orders" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Label>
            <Label text="Store">
              <Select value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value as CaseInput["merchant"] })}>
                {merchants.map((m) => (
                  <option key={m} value={m}>{merchantLabel[m]}</option>
                ))}
              </Select>
            </Label>
            <Label text="Card">
              <Select value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })}>
                <option value="sbi">SBI Card</option>
                <option value="other">Another bank</option>
              </Select>
            </Label>
            {form.bank === "other" && (
              <>
                <Label text="Bank name">
                  <Input placeholder="HDFC" value={form.otherBank} onChange={(e) => setForm({ ...form, otherBank: e.target.value })} required />
                </Label>
                <Label text="Fee to close the EMI early (%)">
                  <Input inputMode="decimal" value={form.feePct} onChange={(e) => setForm({ ...form, feePct: e.target.value })} required />
                </Label>
                <Label text="Days to raise a dispute">
                  <Input inputMode="numeric" value={form.disputeDays} onChange={(e) => setForm({ ...form, disputeDays: e.target.value })} />
                </Label>
              </>
            )}
            <Label text="Card charge converted to EMI (₹)">
              <Input inputMode="decimal" placeholder="58375.64" value={form.charge} onChange={(e) => setForm({ ...form, charge: e.target.value })} required />
            </Label>
            <Label text="Charged on">
              <Input type="date" value={form.chargedOn} onChange={(e) => setForm({ ...form, chargedOn: e.target.value })} required />
            </Label>
            <Label text="Statement with the first EMI">
              <Input type="date" value={form.firstStatementOn} onChange={(e) => setForm({ ...form, firstStatementOn: e.target.value })} required />
            </Label>
            <Label text="Interest rate (% a year)">
              <Input inputMode="decimal" placeholder="17" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required />
            </Label>
            <Label text="Months">
              <Input inputMode="numeric" value={form.tenure} onChange={(e) => setForm({ ...form, tenure: e.target.value })} required />
            </Label>
            <Label text="Processing fee (₹)">
              <Input inputMode="decimal" placeholder="89" value={form.processingFee} onChange={(e) => setForm({ ...form, processingFee: e.target.value })} />
            </Label>
            <Label text="Card account (optional)">
              <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                <option value="">None</option>
                {accounts.data?.filter((a) => a.type === "credit_card").map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Label>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Orders in this charge</h3>
            <div className="flex flex-col gap-2">
              {orders.map((o, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1.5fr_1fr_1.3fr_1fr_auto]">
                  <Input aria-label="Item" placeholder="Item" value={o.item} onChange={(e) => setOrder(i, { item: e.target.value })} required={i === 0} />
                  <Input aria-label="Order ID" placeholder="Order ID" value={o.merchantOrderId} onChange={(e) => setOrder(i, { merchantOrderId: e.target.value })} />
                  <Input aria-label="Price" inputMode="decimal" placeholder="Price ₹" value={o.price} onChange={(e) => setOrder(i, { price: e.target.value })} required={!!o.item} />
                  <Select aria-label="Status" value={o.status} onChange={(e) => setOrder(i, { status: e.target.value as OrderStatus })}>
                    {orderStatusOptions.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                  <Input
                    aria-label="Refund"
                    inputMode="decimal"
                    placeholder={o.status === "kept" ? "No refund" : "Refund ₹"}
                    disabled={o.status === "kept"}
                    value={o.refund}
                    onChange={(e) => setOrder(i, { refund: e.target.value })}
                  />
                  <Button type="button" variant="danger" className={cx("px-2", orders.length === 1 && "invisible")} onClick={() => setOrders((rows) => rows.filter((_, j) => j !== i))}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" className="mt-2" onClick={() => setOrders((rows) => [...rows, emptyOrder()])}>
              Add another order
            </Button>
            <p className="mt-1 text-xs text-zinc-500">Leave the refund empty to expect the full price back.</p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <ErrorText>{error}</ErrorText>
            <Button disabled={saving}>Open case</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
