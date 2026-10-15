import { isIsoDate } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { download, htmlResponse, transactionsCsv, transactionsHtml } from "@/server/export";
import { fromIsoDate, handle, HttpError, requireUserId, toIsoDate } from "@/server/http";
import { summaryFor } from "@/server/ledger";

/** Transactions between two dates as a CSV file or a printable report (format=csv|html). */
export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const q = new URL(req.url).searchParams;
  const from = q.get("from") ?? "";
  const to = q.get("to") ?? "";
  const format = q.get("format") ?? "csv";
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) throw new HttpError(400, "from and to must be YYYY-MM-DD dates, from first");
  if (format !== "csv" && format !== "html") throw new HttpError(400, "format must be csv or html");

  const [txns, accounts, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, occurredOn: { gte: fromIsoDate(from), lte: fromIsoDate(to) } },
      orderBy: [{ occurredOn: "asc" }, { createdAt: "asc" }],
    }),
    prisma.moneyAccount.findMany({ where: { userId } }),
    prisma.category.findMany({ where: { OR: [{ userId }, { userId: null }] } }),
  ]);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const rows = txns.map((t) => ({
    occurredOn: toIsoDate(t.occurredOn),
    kind: t.kind,
    amountPaise: Number(t.amountPaise),
    category: t.categoryId ? (categoryName.get(t.categoryId) ?? "") : "",
    account: accountName.get(t.accountId) ?? "",
    transferTo: t.transferAccountId ? (accountName.get(t.transferAccountId) ?? "") : "",
    incomeSource: t.incomeSource ?? "",
    note: t.note ?? "",
    tags: t.tags,
  }));

  if (format === "csv") return download(transactionsCsv(rows), `moneymania-${from}-to-${to}.csv`, "text/csv");
  const summary = await summaryFor(userId, from, to);
  return htmlResponse(transactionsHtml(from, to, summary, rows, (id) => (id ? (categoryName.get(id) ?? "Other") : "Uncategorised")));
});
