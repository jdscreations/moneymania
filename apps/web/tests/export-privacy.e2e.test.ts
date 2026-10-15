/** End-to-end checks for calculator prefill, consents, CSV and report exports, the full data export and account deletion. */
import { addDays, addMonths, createApiClient, periodRange, todayIn, type ApiClient } from "@moneymania/core";
import { beforeAll, describe, expect, it } from "vitest";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function signUp(): Promise<{ api: ApiClient; cookie: string }> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await fetch(`${base}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ name: "E2E", email, password: "password123" }),
  });
  expect(res.status).toBe(200);
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  return { api: createApiClient({ baseUrl: base, headers: () => ({ cookie, origin: base }) }), cookie };
}

const lastMonth = periodRange("month", addMonths(periodRange("month", todayIn()).from, -1));

describe("calculators, exports and privacy", () => {
  let api: ApiClient;
  let cookie: string;
  beforeAll(async () => {
    ({ api, cookie } = await signUp());
  });

  it("prefills the calculators from last month's entries and today's balances", async () => {
    const bank = await api.accounts.create({ type: "bank", name: "SBI savings", openingBalancePaise: 10_000_000 });
    await api.accounts.create({ type: "credit_card", name: "SBI Card", openingBalancePaise: -500_000 });
    await api.transactions.create({ accountId: bank.id, kind: "income", amountPaise: 6_000_000, occurredOn: lastMonth.from, categoryId: "cat_salary", incomeSource: "salary" });
    await api.transactions.create({ accountId: bank.id, kind: "expense", amountPaise: 1_500_000, occurredOn: lastMonth.to, categoryId: "cat_rent", note: "Rent, October" });
    await api.bills.create({ name: "Term insurance", amountPaise: 1_200_000, frequency: "yearly", nextDueOn: addDays(todayIn(), 40) });

    const ctx = await api.calculatorContext();
    expect(ctx).toEqual({
      months: 1,
      avgMonthlyIncomePaise: 6_000_000,
      avgMonthlySpendPaise: 1_500_000,
      liquidPaise: 10_000_000 + 6_000_000 - 1_500_000,
      emiMonthlyPaise: 0,
      billsMonthlyPaise: 100_000,
    });
  });

  it("records consent grants and withdrawals", async () => {
    expect((await api.consents.list()).every((c) => !c.granted)).toBe(true);
    await api.consents.set({ purpose: "data_processing", granted: true });
    await api.consents.set({ purpose: "email_reminders", granted: true });
    const withdrawn = await api.consents.set({ purpose: "email_reminders", granted: false });
    expect(withdrawn.map((c) => [c.purpose, c.granted])).toEqual([
      ["data_processing", true],
      ["email_reminders", false],
      ["push_reminders", false],
    ]);
  });

  it("exports transactions as CSV and as a printable report", async () => {
    const csv = await api.exports.transactions(lastMonth.from, lastMonth.to, "csv");
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe("Date,Type,Amount (INR),Category,Account,Transfer to,Income source,Note,Tags");
    expect(lines).toContain(`${lastMonth.to},expense,15000.00,Rent,SBI savings,,,"Rent, October",`);
    const html = await api.exports.transactions(lastMonth.from, lastMonth.to, "html");
    expect(html).toContain("Print or save as PDF");
    expect(html).toContain("₹60,000.00");
    await expect(api.exports.transactions(lastMonth.to, lastMonth.from, "csv")).rejects.toMatchObject({ status: 400 });
  });

  it("exports a purchase case", async () => {
    const c = await api.cases.create({
      title: "Festival <orders>",
      merchant: "amazon_in",
      bankCode: "sbi",
      chargePaise: 5_837_564,
      chargedOn: addDays(todayIn(), -7),
      firstStatementOn: addDays(todayIn(), 11),
      annualRateBps: 1700,
      tenureMonths: 12,
      orders: [{ item: "AC", amountPaise: 3_699_000, status: "cancelled", refundPaise: 3_599_000 }],
    });
    const csv = await api.exports.purchaseCase(c.id, "csv");
    expect(csv).toContain("Order,,AC,,36990.00,Cancelled,35990.00,,");
    const html = await api.exports.purchaseCase(c.id, "html");
    expect(html).toContain("<h1>Festival &lt;orders&gt;</h1>");
    expect(html).toContain("Ask the bank to cancel this EMI");
  });

  it("downloads everything stored about the user, then deletes it all with the account", async () => {
    const res = await fetch(`${base}/api/export/me`, { headers: { cookie } });
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="moneymania-data-/);
    const data = await res.json();
    expect(data.transactions).toHaveLength(2);
    expect(data.purchaseCases[0].orders[0].refundPaise).toBe(3_599_000);
    expect(data.consents.map((c: { purpose: string; withdrawnAt: string | null }) => [c.purpose, !!c.withdrawnAt]).sort()).toEqual([["data_processing", false], ["email_reminders", true]]);
    expect(JSON.stringify(data)).not.toMatch(/password/i);

    const del = await fetch(`${base}/api/auth/delete-user`, { method: "POST", headers: { cookie, origin: base, "content-type": "application/json" }, body: "{}" });
    expect(del.status).toBe(200);
    await expect(api.accounts.list()).rejects.toMatchObject({ status: 401 });
  });
});
