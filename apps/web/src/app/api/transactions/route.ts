import { isIsoDate, transactionInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { fromIsoDate, handle, HttpError, parseBody, requireUserId } from "@/server/http";
import { transactionDto } from "@/server/serialize";
import { transactionData } from "@/server/transactions";

export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const params = new URL(req.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) throw new HttpError(400, "Pass from and to as YYYY-MM-DD");
  const rows = await prisma.transaction.findMany({
    where: { userId, occurredOn: { gte: fromIsoDate(from), lte: fromIsoDate(to) } },
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    take: 1000,
  });
  return Response.json(rows.map(transactionDto));
});

export const POST = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const input = await parseBody(req, transactionInput);
  const row = await prisma.transaction.create({ data: await transactionData(userId, input) });
  return Response.json(transactionDto(row), { status: 201 });
});
