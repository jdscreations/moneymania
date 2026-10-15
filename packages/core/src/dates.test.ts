import { describe, expect, it } from "vitest";
import { addDays, eachDay, isIsoDate, periodRange, todayIn } from "./dates";

describe("dates", () => {
  it("validates calendar dates", () => {
    expect(isIsoDate("2026-10-15")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("15-10-2026")).toBe(false);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("builds Monday-to-Sunday weeks", () => {
    // 15 Oct 2026 is a Thursday.
    expect(periodRange("week", "2026-10-15")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(periodRange("week", "2026-10-12")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(periodRange("week", "2026-10-18")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });

  it("builds whole months, including February in a leap year", () => {
    expect(periodRange("month", "2026-10-15")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange("month", "2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("lists each day inclusive", () => {
    expect(eachDay("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });

  it("gives today's date in India even when UTC is still yesterday", () => {
    expect(todayIn("Asia/Kolkata", new Date("2026-10-14T20:00:00Z"))).toBe("2026-10-15");
  });
});
