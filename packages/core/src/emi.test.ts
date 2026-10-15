import { describe, expect, it } from "vitest";
import { emiSchedule, installmentDueDates, monthlyEmi, prepaymentWhatIf, summarizeEmi } from "./emi";

describe("monthlyEmi", () => {
  it("matches the textbook value for Rs 1,00,000 at 12% over 12 months", () => {
    // Standard reducing-balance EMI is Rs 8,884.88.
    expect(monthlyEmi({ principal: 10_000_000, annualRateBps: 1200, tenureMonths: 12 })).toBe(888_488);
  });

  it("splits evenly at 0% (no-cost EMI)", () => {
    expect(monthlyEmi({ principal: 1_200_000, annualRateBps: 0, tenureMonths: 12 })).toBe(100_000);
  });

  it("rejects non-paise principal", () => {
    expect(() => monthlyEmi({ principal: 10.5, annualRateBps: 1200, tenureMonths: 12 })).toThrow(RangeError);
  });
});

describe("emiSchedule", () => {
  const terms = { principal: 5_837_564, annualRateBps: 1700, tenureMonths: 12, gstOnInterestBps: 1800 };

  it("repays exactly the principal and ends at zero", () => {
    const rows = emiSchedule(terms);
    expect(rows).toHaveLength(12);
    expect(rows.at(-1)?.balanceAfter).toBe(0);
    expect(rows.reduce((s, r) => s + r.principal, 0)).toBe(terms.principal);
  });

  it("charges 18% GST on each month's interest", () => {
    for (const row of emiSchedule(terms)) {
      expect(row.gst).toBe(Math.round(row.interest * 0.18));
      expect(row.total).toBe(row.emi + row.gst);
    }
  });

  it("summarizes the founder's 12-month 17% SBI card EMI", () => {
    const s = summarizeEmi(terms);
    expect(s.totalPaid).toBe(terms.principal + s.totalInterest + s.totalGst);
    // Reducing-balance interest on Rs 58,375.64 at 17% for 12 months is about Rs 5,500.
    expect(s.totalInterest).toBeGreaterThan(540_000);
    expect(s.totalInterest).toBeLessThan(560_000);
  });
});

describe("installmentDueDates", () => {
  it("keeps the same day each month, clamping short months", () => {
    expect(installmentDueDates("2026-11-30", 4)).toEqual(["2026-11-30", "2026-12-30", "2027-01-30", "2027-02-28"]);
  });
});

describe("prepaymentWhatIf", () => {
  const loan = { principal: 50_000_000, annualRateBps: 1050, tenureMonths: 60, gstOnInterestBps: 0 };

  it("saves more by shortening the tenure than by lowering the EMI", () => {
    const tenure = prepaymentWhatIf(loan, 12, 10_000_000, "reduce_tenure");
    const emi = prepaymentWhatIf(loan, 12, 10_000_000, "reduce_emi");
    expect(tenure.newEmi).toBeLessThanOrEqual(monthlyEmi(loan));
    expect(tenure.newRemainingMonths).toBeLessThan(48);
    expect(emi.newRemainingMonths).toBe(48);
    expect(emi.newEmi).toBeLessThan(monthlyEmi(loan));
    expect(tenure.saved).toBeGreaterThan(emi.saved);
    expect(emi.saved).toBeGreaterThan(0);
  });

  it("rejects a prepayment that clears the whole balance", () => {
    expect(() => prepaymentWhatIf(loan, 0, 50_000_000, "reduce_emi")).toThrow(RangeError);
  });
});
