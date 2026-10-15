import { pushTokenInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { handle, noContent, parseBody, requireUserId } from "@/server/http";

/** Remember this phone for reminder pushes. A token moves to whoever signed in on the device last. */
export const POST = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const { token, platform } = await parseBody(req, pushTokenInput);
  await prisma.pushToken.upsert({ where: { token }, create: { token, platform, userId }, update: { userId, platform } });
  return noContent();
});
