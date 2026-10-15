import { describe, expect, it } from "vitest";
import { emergencyFund, monthsToGoal, savingsGoal, sipFutureValue } from "./calculators";

describe("savingsGoal", () => {
  it("splits a goal evenly with no returns", () => {
    expect(savingsGoal({ target: 12_000_000, saved: 0, months: 12, annualReturnBps: 0 }).monthly).toBe(1_000_000);
  });

  it("needs less each month when savings earn interest and some is saved already", () => {
    const r = savingsGoal({ target: 50_000_000, saved: 10_000_000, months: 24, annualReturnBps: 700 });
    expect(r.monthly).toBeLessThan((50_000_000 - 10_000_000) / 24);
    expect(r.savedGrowsTo).toBeGreaterThan(10_000_000);
    // Saving that much each month does reach the goal in 24 months.
    expect(monthsToGoal(50_000_000, 10_000_000, r.monthly, 700)).toBe(24);
  });

  it("asks for nothing when the savings already cover the goal", () => {
    expect(savingsGoal({ target: 1_000_000, saved: 2_000_000, months: 6, annualReturnBps: 0 }).monthly).toBe(0);
  });
});

describe("monthsToGoal", () => {
  it("returns null when saving nothing", () => {
    expect(monthsToGoal(1_000_000, 0, 0, 0)).toBeNull();
  });
});

describe("sipFutureValue", () => {
  it("grows ₹5,000 a month at 12% for 10 years to about ₹11.6 lakh", () => {
    const r = sipFutureValue({ monthly: 500_000, annualReturnBps: 1200, years: 10 });
    expect(r.invested).toBe(60_000_000);
    expect(Math.round(r.value / 100)).toBe(1_161_695);
    expect(r.gains).toBe(r.value - r.invested);
  });

  it("invests more with a yearly step-up", () => {
    const flat = sipFutureValue({ monthly: 500_000, annualReturnBps: 1200, years: 5 });
    const stepped = sipFutureValue({ monthly: 500_000, annualReturnBps: 1200, years: 5, stepUpBps: 1000 });
    expect(stepped.invested).toBeGreaterThan(flat.invested);
  });
});

describe("emergencyFund", () => {
  it("works out the shortfall and the monthly saving to close it", () => {
    const r = emergencyFund({ monthlySpend: 4_000_000, monthsOfCover: 6, available: 6_000_000, buildMonths: 12 });
    expect(r).toEqual({ target: 24_000_000, shortfall: 18_000_000, coveredBps: 2500, monthsCovered: 1.5, monthly: 1_500_000 });
  });
});
