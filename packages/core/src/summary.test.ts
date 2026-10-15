import { describe, expect, it } from "vitest";
import { accountBalance, summarize, type LedgerEntry } from "./summary";

const e = (p: Partial<LedgerEntry> & Pick<LedgerEntry, "kind" | "amountPaise">): LedgerEntry => ({
  occurredOn: "2026-10-15",
  accountId: "cash",
  categoryId: null,
  ...p,
});

describe("summarize", () => {
  it("nets income against spending and ignores own-account transfers", () => {
    const s = summarize(
      [
        e({ kind: "income", amountPaise: 120_000, categoryId: "gig" }),
        e({ kind: "expense", amountPaise: 30_000, categoryId: "fuel" }),
        e({ kind: "transfer", amountPaise: 50_000, transferAccountId: "bank" }),
      ],
      "2026-10-15",
      "2026-10-15",
    );
    expect(s.incomePaise).toBe(120_000);
    expect(s.expensePaise).toBe(30_000);
    expect(s.netPaise).toBe(90_000);
  });

  it("takes refunds off spending in their category, not counted as income", () => {
    const s = summarize(
      [
        e({ kind: "expense", amountPaise: 5_837_564, categoryId: "shopping" }),
        e({ kind: "refund", amountPaise: 4_166_300, categoryId: "shopping" }),
      ],
      "2026-10-15",
      "2026-10-15",
    );
    expect(s.incomePaise).toBe(0);
    expect(s.expensePaise).toBe(1_671_264);
    expect(s.expenseByCategory).toEqual([{ categoryId: "shopping", totalPaise: 1_671_264 }]);
  });

  it("fills every day of the range and skips entries outside it", () => {
    const s = summarize(
      [e({ kind: "expense", amountPaise: 100, occurredOn: "2026-10-14" }), e({ kind: "expense", amountPaise: 999, occurredOn: "2026-10-20" })],
      "2026-10-13",
      "2026-10-19",
    );
    expect(s.days).toHaveLength(7);
    expect(s.days.at(1)).toEqual({ date: "2026-10-14", incomePaise: 0, expensePaise: 100, netPaise: -100 });
    expect(s.expensePaise).toBe(100);
  });

  it("sorts categories by size", () => {
    const s = summarize(
      [e({ kind: "expense", amountPaise: 100, categoryId: "a" }), e({ kind: "expense", amountPaise: 900, categoryId: "b" })],
      "2026-10-15",
      "2026-10-15",
    );
    expect(s.expenseByCategory.map((c) => c.categoryId)).toEqual(["b", "a"]);
  });
});

describe("accountBalance", () => {
  it("applies income, spending, refunds and transfers in and out", () => {
    const entries = [
      e({ kind: "income", amountPaise: 10_000 }),
      e({ kind: "expense", amountPaise: 2_500 }),
      e({ kind: "refund", amountPaise: 500 }),
      e({ kind: "transfer", amountPaise: 3_000, transferAccountId: "bank" }),
      e({ kind: "transfer", amountPaise: 1_000, accountId: "bank", transferAccountId: "cash" }),
    ];
    expect(accountBalance("cash", 1_000, entries)).toBe(1_000 + 10_000 - 2_500 + 500 - 3_000 + 1_000);
    expect(accountBalance("bank", 0, entries)).toBe(3_000 - 1_000);
  });
});
