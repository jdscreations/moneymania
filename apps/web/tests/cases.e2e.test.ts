/** End-to-end checks for EMI refund cases: the founder's SBI case, order updates, the case log and closing the EMI. */
import { addDays, createApiClient, todayIn, type ApiClient, type CaseInput } from "@moneymania/core";
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

// The founder's case, moved so the charge was 7 days ago and the first statement is 18 days after it.
const today = todayIn();
const chargedOn = addDays(today, -7);
const founderCase: CaseInput = {
  title: "Great Indian Festival orders",
  merchant: "amazon_in",
  bankCode: "sbi",
  chargePaise: 5_837_564,
  chargedOn,
  firstStatementOn: addDays(chargedOn, 18),
  annualRateBps: 1700,
  tenureMonths: 12,
  processingFeePaise: 8_900,
  orders: [
    { merchantOrderId: "171-8289924-8562724", item: "Gaming chair", amountPaise: 759_900 },
    { merchantOrderId: "171-8289924-8562724", item: "1.5T AC", amountPaise: 3_699_000, status: "cancelled", refundPaise: 3_599_000 },
    { merchantOrderId: "171-2963410-8649105", item: "Monitor", amountPaise: 1_399_900 },
    { merchantOrderId: "171-0622597-5521903", item: "Mouse and pad", amountPaise: 72_800 },
    { merchantOrderId: "171-0602584-5813151", item: "Workstation table", amountPaise: 600_700, status: "return_requested", refundPaise: 547_000 },
    { merchantOrderId: "171-2914387-5469146", item: "Furniture plan", amountPaise: 20_300, status: "return_requested", refundPaise: 20_300 },
  ],
};

describe("refund cases", () => {
  let api: ApiClient;
  let other: ApiClient;
  beforeAll(async () => {
    [api, other] = await Promise.all([signUp(), signUp()]);
  });

  it("shows about ₹7,092 to keep and about ₹2,300 to foreclose for the founder's SBI case", async () => {
    const c = await api.cases.create(founderCase);
    expect(c.emi).toMatchObject({ lender: "SBI Card", kind: "card_merchant", emiPaise: 532_414 });
    expect(c.bankCode).toBe("sbi");
    expect(c.disputeDeadlineOn).toBe(addDays(chargedOn, 45));
    expect(c.disputeDaysLeft).toBe(38);
    const a = c.analysis!;
    expect(Math.round(a.keepCost / 100)).toBe(7092);
    expect(Math.round(a.foreclosure.cost / 100)).toBe(2294);
    expect(a.refundPending).toBe(3_599_000 + 547_000 + 20_300);
    expect(a.verdict).toBe("foreclose");
    expect(c.escalation.map((s) => s.step)).toEqual(["Customer care", "Nodal officer", "RBI Ombudsman"]);
    expect(c.events).toEqual([expect.objectContaining({ type: "note", on: chargedOn })]);

    const emi = await api.emis.get(c.emi!.id);
    expect(emi.installments[0]!.emiPaise).toBe(582_033);

    expect((await api.cases.list()).map((x) => x.id)).toEqual([c.id]);
    await expect(other.cases.get(c.id)).rejects.toMatchObject({ status: 404 });
  });

  it("logs order changes and notes, and resolves when the EMI is foreclosed", async () => {
    const c = await api.cases.create({ ...founderCase, title: "Second case" });
    const ac = c.orders.find((o) => o.item === "1.5T AC")!;
    const posted = await api.cases.updateOrder(c.id, ac.id, { refundPostedOn: today });
    expect(posted.analysis!.refundPosted).toBe(3_599_000);
    expect(posted.events[0]!.note).toContain("refund of ₹35,990.00 posted");

    const logged = await api.cases.addEvent(c.id, { type: "sr_number", reference: "1-5CJRNCHS", note: "SBI says EMI cancels only on full refund" });
    expect(logged.events.some((e) => e.reference === "1-5CJRNCHS")).toBe(true);

    const closed = await api.cases.closeEmi(c.id, { outcome: "foreclosed", on: today });
    expect(closed.status).toBe("resolved");
    expect(closed.emi?.status).toBe("foreclosed");
    expect(closed.analysis?.verdict).toBe("closed");
    expect(closed.emi?.nextDue).toBeNull();
    await expect(api.cases.closeEmi(c.id, { outcome: "foreclosed", on: today })).rejects.toMatchObject({ status: 409 });
  });

  it("puts the dispute deadline in Coming up", async () => {
    const upcoming = await api.upcoming(60);
    expect(upcoming.filter((u) => u.type === "dispute").map((u) => u.name)).toEqual(["Last day to dispute: Great Indian Festival orders"]);
  });

  it("needs a foreclosure fee for banks it has no rules for", async () => {
    await expect(api.cases.create({ ...founderCase, bankCode: "hdfc" })).rejects.toMatchObject({ status: 400 });
    const c = await api.cases.create({ ...founderCase, bankCode: "hdfc", foreclosureFeeBps: 300, disputeWindowDays: 30 });
    expect(c.emi?.lender).toBe("HDFC");
    expect(c.disputeDeadlineOn).toBe(addDays(chargedOn, 30));
    await api.cases.remove(c.id);
    await expect(api.emis.get(c.emi!.id)).rejects.toMatchObject({ status: 404 });
  });
});
