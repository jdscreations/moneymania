import { formatINR } from "@moneymania/core";
import type { DueItem } from "./upcoming";

const when = (i: DueItem) => (i.daysLeft < 0 ? `overdue by ${-i.daysLeft} day${i.daysLeft === -1 ? "" : "s"}` : i.daysLeft === 0 ? "due today" : `due in ${i.daysLeft} day${i.daysLeft === 1 ? "" : "s"}`);

export const reminderLine = (i: DueItem) =>
  i.type === "dispute"
    ? `${i.name}: ${i.daysLeft === 0 ? "today" : `in ${i.daysLeft} day${i.daysLeft === 1 ? "" : "s"}`} (${formatINR(i.amountPaise)} charge)`
    : `${i.name}: ${formatINR(i.amountPaise)}, ${when(i)}${i.autopay ? " (autopay)" : ""}`;

/** Email through Resend when RESEND_API_KEY is set; otherwise logs and reports not sent. */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[reminders] email not configured; would send to ${to}: ${subject}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.REMINDER_FROM_EMAIL ?? "MoneyMania <reminders@moneymania.app>", to, subject, text }),
  });
  if (!res.ok) console.error(`[reminders] email failed ${res.status}: ${await res.text()}`);
  return res.ok;
}

/** Push through Expo's push service to every device the user signed in on. */
export async function sendPush(tokens: string[], title: string, body: string): Promise<boolean> {
  if (tokens.length === 0) return false;
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: "default" }))),
  });
  if (!res.ok) console.error(`[reminders] push failed ${res.status}: ${await res.text()}`);
  return res.ok;
}
