import { todayIn } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { download } from "@/server/export";
import { handle, requireUserId } from "@/server/http";

/** Everything MoneyMania stores about the signed-in user, as one JSON file. Sessions and password hashes are left out. */
export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      currency: true,
      timezone: true,
      locale: true,
      createdAt: true,
      moneyAccounts: true,
      categories: true,
      transactions: { orderBy: { occurredOn: "asc" } },
      budgets: true,
      bills: true,
      emis: { include: { installments: { orderBy: { number: "asc" } } } },
      purchaseCases: { include: { orders: true, events: { orderBy: { at: "asc" } } } },
      reminders: true,
      pushTokens: { select: { platform: true, createdAt: true } },
      consents: true,
    },
  });
  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), note: "Amounts ending in Paise are in paise (100 paise = 1 rupee).", ...user },
    (_key, value: unknown) => (typeof value === "bigint" ? Number(value) : value),
    2,
  );
  return download(body, `moneymania-data-${todayIn()}.json`, "application/json");
});
