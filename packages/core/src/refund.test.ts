import { describe, expect, it } from "vitest";
import { installmentDueDates, emiSchedule } from "./emi";
import { analyzeCase, disputeDeadline, type CaseAnalysisInput, type CaseOrder } from "./refund";

// The founder's case: five Amazon orders in one SBI Card charge of ₹58,375.64 on 7 Oct 2026,
// converted to a 12-month EMI at 17%, first billed on the 25 Oct statement.
const terms = { principal: 5_837_564, annualRateBps: 1700, tenureMonths: 12, gstOnInterestBps: 1800, brokenPeriodDays: 18 };
const orders: CaseOrder[] = [
  { amount: 759_900, status: "kept", refund: 0, refundPostedOn: null },
  { amount: 3_699_000, status: "cancelled", refund: 3_599_000, refundPostedOn: "2026-10-10" },
  { amount: 1_399_900, status: "kept", refund: 0, refundPostedOn: null },
  { amount: 72_800, status: "kept", refund: 0, refundPostedOn: null },
  { amount: 600_700, status: "returned", refund: 547_000, refundPostedOn: null },
  { amount: 20_300, status: "returned", refund: 20_300, refundPostedOn: null },
];
const sbi = { feeBps: 300, gstBps: 1800, cancelOnFullRefundOnly: true };
const base: CaseAnalysisInput = {
  terms,
  chargedOn: "2026-10-07",
  dueDates: installmentDueDates("2026-10-25", 12),
  today: "2026-10-14",
  rule: sbi,
  orders,
  emiActive: true,
};

describe("SBI broken-period interest", () => {
  it("matches the first EMI and the regular EMI SBI quoted", () => {
    const rows = emiSchedule(terms);
    expect(rows[0]!.emi).toBe(582_033); // ₹5,820.33
    expect(rows[1]!.emi).toBe(532_414); // ₹5,324.14
  });
});

describe("analyzeCase", () => {
  it("shows about ₹7,092 to keep and about ₹2,300 to foreclose for the founder's case", () => {
    const a = analyzeCase(base);
    expect(a.billedCount).toBe(0);
    expect(Math.round(a.keepCost / 100)).toBe(7092);
    expect(Math.round(a.foreclosure.cost / 100)).toBe(2294);
    expect(Math.round(a.weeklyRise / 100)).toBe(228);
    expect(a.refundPosted).toBe(3_599_000);
    expect(a.refundPending).toBe(567_300);
    expect(a.keptValue).toBe(2_232_600);
    expect(a.verdict).toBe("foreclose");
  });

  it("counts interest since the last statement once installments are billed", () => {
    const a = analyzeCase({ ...base, today: "2026-11-01" });
    expect(a.billedCount).toBe(1);
    expect(a.outstanding).toBe(emiSchedule(terms)[0]!.balanceAfter);
    expect(a.keepCost).toBeLessThan(analyzeCase(base).keepCost);
    expect(a.foreclosure.accruedInterest).toBeGreaterThan(0);
  });

  it("says to ask for a cancellation when every order is refunded", () => {
    const all = orders.map((o) => ({ ...o, status: "returned" as const, refund: o.amount }));
    expect(analyzeCase({ ...base, orders: all }).verdict).toBe("cancel");
  });

  it("says to keep an EMI with no refunds", () => {
    const none = orders.map((o) => ({ ...o, status: "kept" as const, refund: 0, refundPostedOn: null }));
    expect(analyzeCase({ ...base, orders: none }).verdict).toBe("keep");
  });

  it("is closed once the EMI is no longer active", () => {
    expect(analyzeCase({ ...base, emiActive: false }).verdict).toBe("closed");
  });
});

describe("disputeDeadline", () => {
  it("is 45 days after a 7 Oct charge for SBI", () => {
    expect(disputeDeadline("2026-10-07", 45)).toBe("2026-11-21");
  });
});
