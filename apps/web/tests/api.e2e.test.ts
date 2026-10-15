/**
 * End-to-end API checks against a running server (pnpm build && pnpm start).
 * Run with: E2E_BASE_URL=http://localhost:3000 pnpm test:e2e
 */
import { createApiClient, type ApiClient } from "@moneymania/core";
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

describe("daily log API", () => {
  let api: ApiClient;
  let other: ApiClient;

  beforeAll(async () => {
    api = await signUp();
    other = await signUp();
  });

  it("rejects requests without a session", async () => {
    const res = await fetch(`${base}/api/accounts`);
    expect(res.status).toBe(401);
  });

  it("logs income and spending and summarizes the day, week and month", async () => {
    const cash = await api.accounts.create({ type: "cash", name: "Wallet", openingBalancePaise: 50_000 });
    const bank = await api.accounts.create({ type: "bank", name: "SBI savings" });
    const categories = await api.categories.list();
    expect(categories.find((c) => c.id === "cat_gig")?.isDefault).toBe(true);

    await api.transactions.create({ accountId: cash.id, kind: "income", amountPaise: 120_000, occurredOn: "2026-10-15", categoryId: "cat_gig", incomeSource: "gig" });
    await api.transactions.create({ accountId: cash.id, kind: "expense", amountPaise: 30_000, occurredOn: "2026-10-15", categoryId: "cat_fuel" });
    await api.transactions.create({ accountId: cash.id, kind: "expense", amountPaise: 10_000, occurredOn: "2026-10-13", categoryId: "cat_food" });
    await api.transactions.create({ accountId: cash.id, kind: "transfer", amountPaise: 40_000, occurredOn: "2026-10-15", transferAccountId: bank.id });

    const day = await api.summary("day", "2026-10-15");
    expect(day).toMatchObject({ incomePaise: 120_000, expensePaise: 30_000, netPaise: 90_000 });

    const week = await api.summary("week", "2026-10-15");
    expect(week.from).toBe("2026-10-12");
    expect(week.expensePaise).toBe(40_000);
    expect(week.days).toHaveLength(7);

    const accounts = await api.accounts.list();
    expect(accounts.find((a) => a.id === cash.id)?.balancePaise).toBe(50_000 + 120_000 - 30_000 - 10_000 - 40_000);
    expect(accounts.find((a) => a.id === bank.id)?.balancePaise).toBe(40_000);

    const list = await api.transactions.list("2026-10-01", "2026-10-31");
    expect(list).toHaveLength(4);
    expect(list.at(0)?.occurredOn).toBe("2026-10-15");
  });

  it("edits and deletes an entry", async () => {
    const acct = await api.accounts.create({ type: "upi", name: "GPay" });
    const t = await api.transactions.create({ accountId: acct.id, kind: "expense", amountPaise: 999, occurredOn: "2026-11-02", categoryId: "cat_food" });
    const edited = await api.transactions.update(t.id, { accountId: acct.id, kind: "expense", amountPaise: 1_999, occurredOn: "2026-11-02", categoryId: "cat_food", note: "Lunch" });
    expect(edited).toMatchObject({ amountPaise: 1_999, note: "Lunch" });
    await api.transactions.remove(t.id);
    expect(await api.transactions.list("2026-11-02", "2026-11-02")).toHaveLength(0);
  });

  it("rejects bad input and mismatched categories", async () => {
    const acct = await api.accounts.create({ type: "cash", name: "Cash" });
    await expect(api.transactions.create({ accountId: acct.id, kind: "expense", amountPaise: -5, occurredOn: "2026-10-15" })).rejects.toMatchObject({ status: 400 });
    await expect(api.transactions.create({ accountId: acct.id, kind: "expense", amountPaise: 500, occurredOn: "2026-10-15", categoryId: "cat_salary" })).rejects.toMatchObject({ status: 400 });
    await expect(api.transactions.create({ accountId: acct.id, kind: "transfer", amountPaise: 500, occurredOn: "2026-10-15" })).rejects.toMatchObject({ status: 400 });
  });

  it("keeps each user's data private", async () => {
    const mine = await api.accounts.create({ type: "cash", name: "Private" });
    await expect(other.transactions.create({ accountId: mine.id, kind: "expense", amountPaise: 100, occurredOn: "2026-10-15" })).rejects.toMatchObject({ status: 404 });
    await expect(other.accounts.archive(mine.id)).rejects.toMatchObject({ status: 404 });
    expect((await other.accounts.list()).some((a) => a.id === mine.id)).toBe(false);
  });

  it("tracks a monthly budget against spending", async () => {
    const acct = await api.accounts.create({ type: "cash", name: "Budget wallet" });
    await api.transactions.create({ accountId: acct.id, kind: "expense", amountPaise: 250_000, occurredOn: "2026-12-05", categoryId: "cat_groceries" });
    const budget = await api.budgets.set({ categoryId: "cat_groceries", month: "2026-12", limitPaise: 600_000 });
    expect(budget).toMatchObject({ limitPaise: 600_000, spentPaise: 250_000 });
    const updated = await api.budgets.set({ categoryId: "cat_groceries", month: "2026-12", limitPaise: 500_000 });
    expect(updated.id).toBe(budget.id);
    expect(await api.budgets.list("2026-12")).toHaveLength(1);
    await expect(api.budgets.set({ categoryId: "cat_salary", month: "2026-12", limitPaise: 1 })).rejects.toMatchObject({ status: 400 });
  });
});
