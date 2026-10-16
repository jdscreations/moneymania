import { prisma } from "@moneymania/db";
import { handle } from "@/server/http";

/** Uptime check: 200 when the app can reach the database, 503 when it can't. */
export const GET = handle(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, database: "up" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, database: "down" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
});
