/** End-to-end checks for bills, EMIs, upcoming payments and the reminder job. */
import { addDays, createApiClient, todayIn, type ApiClient } from "@moneymania/core";
import { beforeAll, describe, expect, it } from "vitest";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function signUp(): Promise<ApiClient> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await fetch(`${base}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ name: "E2E", email, password: "password123" }),
  });
  expect(res.status).toBe(200);
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  return createApiClient({ baseUrl: base, headers: () => ({ cookie, origin: base }) });
}

describe("bills", () => {
  let api: ApiClient;
  beforeAll(async () => {
    api = await signUp();
  });

  it("pays a monthly bill, logs the spend and moves to next month", async () => {
    const bank = await api.accounts.create({ type: "bank", name: "HDFC", openingBalancePaise: 1_000_000 });
    const bill = await api.bills.create({ name: "Airtel postpaid", amountPaise: 59_900, frequency: "monthly", nextDueOn: "2026-10-31", categoryId: "cat_mobile" });
    const paid = await api.bills.pay(bill.id, { accountId: bank.id, paidOn: "2026-10-30" });
    expect(paid).toMatchObject({ nextDueOn: "2026-11-30", lastPaidOn: "2026-10-30" });
    const again = await api.bills.pay(bill.id, { paidOn: "2026-11-29" });
    expect(again.nextDueOn).toBe("2026-12-31");
    const spends = await api.transactions.list("2026-10-30", "2026-10-30");
    expect(spends).toEqual([expect.objectContaining({ kind: "expense", amountPaise: 59_900, categoryId: "cat_mobile", note: "Airtel postpaid" })]);
    expect((await api.accounts.list())[0]?.balancePaise).toBe(1_000_000 - 59_900);
  });

  it("finishes a one-time bill after paying it", async () => {
    const bill = await api.bills.create({ name: "Car insurance", amountPaise: 1_250_000, frequency: "once", nextDueOn: "2026-12-01" });
    expect((await api.bills.pay(bill.id, { paidOn: "2026-11-28" })).nextDueOn).toBeNull();
    await expect(api.bills.pay(bill.id, { paidOn: "2026-11-29" })).rejects.toMatchObject({ status: 400 });
  });
});

describe("EMIs", () => {
  let api: ApiClient;
  beforeAll(async () => {
    api = await signUp();
  });

  it("builds the schedule for the founder's SBI card EMI", async () => {
    const emi = await api.emis.create({
      name: "Amazon order on SBI card",
      kind: "card_merchant",
      lender: "SBI Card",
      principalPaise: 5_837_564,
      annualRateBps: 1700,
      tenureMonths: 12,
      firstDueOn: "2026-11-07",
    });
    expect(emi.installments).toHaveLength(12);
    expect(emi.installments.at(-1)?.dueOn).toBe("2027-10-07");
    expect(emi.installments.reduce((s, i) => s + i.principalPaise, 0)).toBe(5_837_564);
    expect(emi.outstandingPaise).toBe(5_837_564);
    expect(emi.nextDue?.number).toBe(1);
    const gst = emi.installments.at(0)!.gstPaise;
    expect(gst).toBe(Math.round(emi.installments.at(0)!.interestPaise * 0.18));
  });

  it("marks installments paid, logs the EMI spend and closes the loan at the end", async () => {
    const bank = await api.accounts.create({ type: "bank", name: "SBI savings" });
    const emi = await api.emis.create({ name: "Phone", kind: "bnpl", lender: "ZestMoney", principalPaise: 3_000_000, annualRateBps: 0, tenureMonths: 3, firstDueOn: "2026-11-05", gstOnInterestBps: 0, alreadyPaid: 1 });
    expect(emi.paidCount).toBe(1);
    const after2 = await api.emis.payInstallment(emi.id, 2, { accountId: bank.id, paidOn: "2026-12-05" });
    expect(after2.paidCount).toBe(2);
    expect(after2.status).toBe("active");
    await expect(api.emis.payInstallment(emi.id, 2, { paidOn: "2026-12-05" })).rejects.toMatchObject({ status: 409 });
    const done = await api.emis.payInstallment(emi.id, 3, { paidOn: "2027-01-05" });
    expect(done.status).toBe("closed");
    expect(done.nextDue).toBeNull();
    const spend = await api.transactions.list("2026-12-05", "2026-12-05");
    expect(spend.at(0)).toMatchObject({ amountPaise: 1_000_000, categoryId: "cat_emi" });
  });

  it("works out what a part-prepayment saves", async () => {
    const loan = await api.emis.create({ name: "Bike loan", kind: "loan", lender: "Bajaj Finance", principalPaise: 15_000_000, annualRateBps: 1200, tenureMonths: 24, firstDueOn: "2026-11-10", gstOnInterestBps: 0, alreadyPaid: 6 });
    const tenure = await api.emis.prepayment(loan.id, { amountPaise: 5_000_000, mode: "reduce_tenure" });
    const emi = await api.emis.prepayment(loan.id, { amountPaise: 5_000_000, mode: "reduce_emi" });
    expect(tenure.saved).toBeGreaterThan(emi.saved);
    expect(emi.newRemainingMonths).toBe(18);
    await expect(api.emis.prepayment(loan.id, { amountPaise: 999_999_999, mode: "reduce_emi" })).rejects.toMatchObject({ status: 400 });
  });

  it("keeps each user's EMIs private", async () => {
    const other = await signUp();
    const mine = (await api.emis.list())[0]!;
    await expect(other.emis.get(mine.id)).rejects.toMatchObject({ status: 404 });
    await expect(other.emis.payInstallment(mine.id, 1, { paidOn: "2026-11-07" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("upcoming and reminders", () => {
  it("lists what is due soon and reminds once per due date", async () => {
    const api = await signUp();
    await api.consents.set({ purpose: "email_reminders", granted: true });
    const today = todayIn();
    await api.bills.create({ name: "Electricity", amountPaise: 180_000, frequency: "monthly", nextDueOn: addDays(today, 2), remindDaysBefore: 3 });
    await api.bills.create({ name: "Netflix", amountPaise: 64_900, frequency: "monthly", nextDueOn: addDays(today, 20) });
    const upcoming = await api.upcoming(7);
    expect(upcoming.map((u) => u.name)).toEqual(["Electricity"]);
    expect(upcoming[0]?.daysLeft).toBe(2);

    const secret = process.env.CRON_SECRET;
    if (!secret) return;
    expect((await fetch(`${base}/api/cron/reminders`)).status).toBe(401);
    const run = async () => (await fetch(`${base}/api/cron/reminders`, { headers: { authorization: `Bearer ${secret}` } })).json();
    const first = await run();
    expect(first.newReminders).toBeGreaterThanOrEqual(1);
    const second = await run();
    expect(second.newReminders).toBe(0);
  });
});
