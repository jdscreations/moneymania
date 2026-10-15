import { describe, expect, it } from "vitest";
import { nextBillDue } from "./bills";
import { addMonths, daysBetween } from "./dates";

describe("addMonths", () => {
  it("clamps to the end of shorter months and returns to the anchor day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-02-28", 1, 31)).toBe("2026-03-31");
    expect(addMonths("2027-12-15", 1)).toBe("2028-01-15");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("goes backwards across years", () => {
    expect(addMonths("2026-01-10", -2)).toBe("2025-11-10");
  });
});

describe("nextBillDue", () => {
  it("advances by the bill's frequency", () => {
    expect(nextBillDue("weekly", "2026-10-15")).toBe("2026-10-22");
    expect(nextBillDue("monthly", "2026-10-05")).toBe("2026-11-05");
    expect(nextBillDue("quarterly", "2026-11-30")).toBe("2027-02-28");
    expect(nextBillDue("yearly", "2026-10-15")).toBe("2027-10-15");
    expect(nextBillDue("once", "2026-10-15")).toBeNull();
  });

  it("keeps a month-end bill on the 31st when the month allows", () => {
    expect(nextBillDue("monthly", "2027-02-28", 31)).toBe("2027-03-31");
  });
});

describe("daysBetween", () => {
  it("counts whole days", () => {
    expect(daysBetween("2026-10-15", "2026-10-18")).toBe(3);
    expect(daysBetween("2026-10-18", "2026-10-15")).toBe(-3);
  });
});
