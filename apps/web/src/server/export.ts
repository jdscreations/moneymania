import { formatINR, verdictCopy, type CaseDetailDto, type IsoDate, type PeriodSummary } from "@moneymania/core";

/** Plain rupee amount for spreadsheets: 58375.64, no symbol or grouping. */
export const rupees = (paise: number) => (paise / 100).toFixed(2);

function cell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  // Quote anything with a comma, quote or newline; prefix formula-like text so spreadsheets don't run it.
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  // The byte-order mark makes Excel read the ₹ sign and Indian names correctly.
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function download(body: string, filename: string, type: string) {
  return new Response(body, {
    headers: { "content-type": `${type}; charset=utf-8`, "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store" },
  });
}

export const htmlResponse = (body: string) => new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

const esc = (s: string | number | null | undefined) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

/** A standalone page that prints cleanly; "Save as PDF" in the print dialog gives the PDF. */
function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  body { font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #18181b; margin: 32px auto; max-width: 820px; padding: 0 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 24px 0 8px; }
  .muted { color: #71717a; } .box { border: 1px solid #e4e4e7; border-radius: 10px; padding: 12px 14px; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: 5px 8px 5px 0; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
  th { font-size: 12px; color: #71717a; font-weight: 500; } .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
  .grid div { border: 1px solid #e4e4e7; border-radius: 8px; padding: 8px 10px; } .grid b { display: block; font-size: 16px; }
  button { font: inherit; padding: 8px 14px; border-radius: 8px; border: 0; background: #059669; color: #fff; cursor: pointer; }
  @media print { .noprint { display: none; } body { margin: 0; } }
</style></head><body>
<p class="noprint"><button onclick="window.print()">Print or save as PDF</button></p>
${body}
<p class="muted" style="margin-top:32px;font-size:12px">Made with MoneyMania on ${esc(fmtDate(new Date().toISOString().slice(0, 10)))}.</p>
</body></html>`;
}

export interface TransactionRow {
  occurredOn: IsoDate;
  kind: string;
  amountPaise: number;
  category: string;
  account: string;
  transferTo: string;
  incomeSource: string;
  note: string;
  tags: string[];
}

export function transactionsCsv(rows: TransactionRow[]) {
  return toCsv(
    ["Date", "Type", "Amount (INR)", "Category", "Account", "Transfer to", "Income source", "Note", "Tags"],
    rows.map((r) => [r.occurredOn, r.kind, rupees(r.amountPaise), r.category, r.account, r.transferTo, r.incomeSource, r.note, r.tags.join("; ")]),
  );
}

export function transactionsHtml(from: IsoDate, to: IsoDate, summary: PeriodSummary, rows: TransactionRow[], categoryName: (id: string | null) => string) {
  const totals = `<div class="grid">
    <div>Earned<b>${formatINR(summary.incomePaise)}</b></div>
    <div>Spent<b>${formatINR(summary.expensePaise)}</b></div>
    <div>Net<b>${formatINR(summary.netPaise)}</b></div>
    <div>Entries<b>${rows.length}</b></div></div>`;
  const byCategory = summary.expenseByCategory.length
    ? `<h2>Spending by category</h2><table>${summary.expenseByCategory.map((c) => `<tr><td>${esc(categoryName(c.categoryId))}</td><td class="num">${formatINR(c.totalPaise)}</td></tr>`).join("")}</table>`
    : "";
  const list = `<h2>All entries</h2><table><tr><th>Date</th><th>Type</th><th>Category</th><th>Account</th><th>Note</th><th class="num">Amount</th></tr>${rows
    .map(
      (r) =>
        `<tr><td>${esc(fmtDate(r.occurredOn))}</td><td>${esc(r.kind)}</td><td>${esc(r.category || r.transferTo)}</td><td>${esc(r.account)}</td><td>${esc(r.note)}</td><td class="num">${formatINR(r.amountPaise)}</td></tr>`,
    )
    .join("")}</table>`;
  return page(`MoneyMania ${from} to ${to}`, `<h1>Money in and out</h1><p class="muted">${esc(fmtDate(from))} to ${esc(fmtDate(to))}</p>${totals}${byCategory}${list}`);
}

const statusLabel: Record<string, string> = { kept: "Kept", cancelled: "Cancelled", return_requested: "Return requested", returned: "Returned" };

export function caseCsv(c: CaseDetailDto) {
  return toCsv(
    ["Section", "Date", "Item or entry", "Order ID or reference", "Amount (INR)", "Status", "Refund (INR)", "Refund posted on", "Note"],
    [
      ["Charge", c.chargedOn, c.title, "", rupees(c.chargePaise), c.status, "", "", c.emi ? `${c.emi.lender} EMI, ${c.emi.annualRateBps / 100}% for ${c.emi.tenureMonths} months` : ""],
      ...c.orders.map((o) => ["Order", "", o.item, o.merchantOrderId, rupees(o.amountPaise), statusLabel[o.status], o.status === "kept" ? "" : rupees(o.refundPaise), o.refundPostedOn, ""]),
      ...[...c.events].reverse().map((e) => ["Log", e.on, e.type, e.reference, "", "", "", "", e.note]),
    ],
  );
}

export function caseHtml(c: CaseDetailDto) {
  const a = c.analysis;
  const lender = c.emi?.lender ?? "the bank";
  const copy = a ? verdictCopy(a, lender) : null;
  const verdict = a && copy ? `<div class="box"><b>${esc(copy.headline)}</b><br><span class="muted">${esc(copy.detail)}</span></div>` : "";
  const numbers =
    a && a.verdict !== "closed"
      ? `<div class="grid">
    <div>Keep the EMI<b>${formatINR(a.keepCost)}</b><span class="muted">interest and GST to come</span></div>
    <div>Close it today<b>${formatINR(a.foreclosure.cost)}</b><span class="muted">fee, interest and GST</span></div>
    <div>To pay the bank today<b>${formatINR(a.foreclosure.payoff)}</b></div>
    <div>Refunds<b>${formatINR(a.refundPosted + a.refundPending)}</b><span class="muted">${formatINR(a.refundPosted)} posted</span></div></div>
    <table style="margin-top:12px;max-width:420px">
      <tr><td>Principal not yet billed</td><td class="num">${formatINR(a.outstanding)}</td></tr>
      <tr><td>Foreclosure fee</td><td class="num">${formatINR(a.foreclosure.fee)}</td></tr>
      <tr><td>GST on the fee</td><td class="num">${formatINR(a.foreclosure.feeGst)}</td></tr>
      <tr><td>Interest since the last statement</td><td class="num">${formatINR(a.foreclosure.accruedInterest)}</td></tr>
      <tr><td>GST on that interest</td><td class="num">${formatINR(a.foreclosure.accruedGst)}</td></tr>
      <tr><td><b>Total</b></td><td class="num"><b>${formatINR(a.foreclosure.payoff)}</b></td></tr></table>`
      : "";
  const orders = `<h2>Orders</h2><table><tr><th>Item</th><th>Order ID</th><th class="num">Price</th><th>Status</th><th class="num">Refund</th><th>Posted</th></tr>${c.orders
    .map(
      (o) =>
        `<tr><td>${esc(o.item)}</td><td>${esc(o.merchantOrderId)}</td><td class="num">${formatINR(o.amountPaise)}</td><td>${esc(statusLabel[o.status])}</td><td class="num">${o.status === "kept" ? "" : formatINR(o.refundPaise)}</td><td>${o.refundPostedOn ? esc(fmtDate(o.refundPostedOn)) : ""}</td></tr>`,
    )
    .join("")}</table>`;
  const log = `<h2>Case log</h2><table><tr><th>Date</th><th>Entry</th><th>Reference</th><th>Note</th></tr>${[...c.events]
    .reverse()
    .map((e) => `<tr><td>${esc(fmtDate(e.on))}</td><td>${esc(e.type.replace("_", " "))}</td><td>${esc(e.reference)}</td><td>${esc(e.note)}</td></tr>`)
    .join("")}</table>`;
  const escalation = c.escalation.length
    ? `<h2>If the bank says no</h2><ol>${c.escalation.map((s) => `<li><b>${esc(s.step)}</b>: ${esc(s.how)}</li>`).join("")}</ol>`
    : "";
  const header = `<h1>${esc(c.title)}</h1><p class="muted">${formatINR(c.chargePaise)} charged on ${esc(fmtDate(c.chargedOn))}${
    c.emi ? ` · ${esc(lender)} EMI at ${(c.emi.annualRateBps / 100).toFixed(2)}% for ${c.emi.tenureMonths} months` : ""
  }${c.disputeDeadlineOn ? ` · dispute by ${esc(fmtDate(c.disputeDeadlineOn))}` : ""}</p>`;
  return page(c.title, header + verdict + numbers + orders + log + escalation);
}
