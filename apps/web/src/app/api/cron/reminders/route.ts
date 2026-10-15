import { todayIn } from "@moneymania/core";
import { prisma, Prisma } from "@moneymania/db";
import { fromIsoDate, handle, HttpError } from "@/server/http";
import { reminderLine, sendEmail, sendPush } from "@/server/notify";
import { dueItems, type DueItem } from "@/server/upcoming";

const subjectOf = { bill: "bill", emi: "emi", dispute: "purchase_case" } as const;

/** Claim a reminder slot; false if this item was already reminded on this channel for this due date. */
async function claim(item: DueItem, channel: "email" | "push") {
  try {
    await prisma.reminder.create({
      data: { userId: item.userId, subjectType: subjectOf[item.type], subjectId: item.id, dueOn: fromIsoDate(item.dueOn), channel },
    });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
    throw err;
  }
}

/**
 * Daily job (Vercel Cron, 9:00 IST). Sends one email and one push per user listing bills, EMIs and dispute deadlines
 * inside their reminder window, at most once per item, due date and channel.
 */
export const GET = handle(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) throw new HttpError(401, "Not allowed");

  const today = todayIn();
  const items = (await dueItems(today, 30)).filter((i) => i.daysLeft <= i.remindDaysBefore && i.daysLeft >= -3);
  const byUser = Map.groupBy(items, (i) => i.userId);
  let emails = 0;
  let newReminders = 0;
  let pushes = 0;

  for (const [userId, list] of byUser) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { pushTokens: true } });
    if (!user || user.deletedAt) continue;

    const forEmail: DueItem[] = [];
    for (const i of list) if (await claim(i, "email")) forEmail.push(i);
    newReminders += forEmail.length;
    if (forEmail.length > 0) {
      const lines = forEmail.map(reminderLine);
      const sent = await sendEmail(user.email, `MoneyMania: ${forEmail.length} payment${forEmail.length === 1 ? "" : "s"} coming up`, `Hi ${user.name},\n\n${lines.join("\n")}\n\nMark them paid in MoneyMania once done.`);
      if (sent) emails++;
    }

    const tokens = user.pushTokens.map((t) => t.token);
    if (tokens.length > 0) {
      const forPush: DueItem[] = [];
      for (const i of list) if (await claim(i, "push")) forPush.push(i);
      if (forPush.length > 0) {
        const title = forPush.length === 1 ? forPush[0]!.name : `${forPush.length} payments coming up`;
        if (await sendPush(tokens, title, forPush.map(reminderLine).join("\n"))) pushes++;
      }
    }
  }

  return Response.json({ date: today, items: items.length, newReminders, emails, pushes });
});
