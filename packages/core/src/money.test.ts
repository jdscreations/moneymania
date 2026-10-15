import { describe, expect, it } from "vitest";
import { applyBps, formatINR, rupeesToPaise } from "./money";

describe("rupeesToPaise", () => {
  it("parses Indian-grouped amounts exactly", () => {
    expect(rupeesToPaise("58,375.64")).toBe(5_837_564);
    expect(rupeesToPaise("₹1,00,000")).toBe(10_000_000);
    expect(rupeesToPaise("Rs. 0.5")).toBe(50);
    expect(rupeesToPaise("-12.30")).toBe(-1230);
  });

  it("rejects amounts with more than two decimals", () => {
    expect(() => rupeesToPaise("1.234")).toThrow(RangeError);
  });
});

describe("formatINR", () => {
  it("uses lakh and crore grouping", () => {
    expect(formatINR(5_837_564)).toBe("₹58,375.64");
    expect(formatINR(1_234_567_800)).toBe("₹1,23,45,678.00");
    expect(formatINR(-1230)).toBe("-₹12.30");
  });
});

describe("applyBps", () => {
  it("computes 18% GST on interest to the paisa", () => {
    expect(applyBps(100_000, 1800)).toBe(18_000);
    expect(applyBps(333, 1800)).toBe(60); // 59.94 rounds to 60
  });
});
