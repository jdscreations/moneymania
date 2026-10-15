"use client";

import { addDays, exportPaths, periodRange, todayIn, type ConsentPurpose } from "@moneymania/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorText, Input, Label } from "@/components/ui";
import { api, useLoad } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const reminderLabels: Partial<Record<ConsentPurpose, string>> = {
  email_reminders: "Email reminders for bills, EMIs and dispute deadlines",
  push_reminders: "Phone notifications for the same reminders",
};

const linkClass = "rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900";

export default function Settings() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const consents = useLoad(() => api.consents.list(), []);
  const month = periodRange("month", todayIn());
  const [range, setRange] = useState({ from: month.from, to: todayIn() });
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    await authClient.signOut();
    router.replace("/");
  }

  async function deleteAccount() {
    if (!confirm("Delete your account and all your data? This cannot be undone. You may want to download your data first.")) return;
    await authClient.deleteUser();
    router.replace("/");
  }

  async function toggle(purpose: ConsentPurpose, granted: boolean) {
    setError(null);
    try {
      await api.consents.set({ purpose, granted });
      consents.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const agreedOn = consents.data?.find((c) => c.purpose === "data_processing")?.grantedAt;
  const validRange = range.from <= range.to;

  return (
    <>
      <h1 className="text-lg font-semibold">Settings</h1>
      <Card className="flex flex-col gap-3">
        <p className="text-sm">
          Signed in as <span className="font-medium">{session?.user.email}</span>
        </p>
        <div>
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Export entries</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Label text="From"><Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Label>
          <Label text="To"><Input type="date" value={range.to} max={addDays(todayIn(), 366)} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Label>
          {validRange && (
            <>
              <a className={linkClass} href={exportPaths.transactions(range.from, range.to, "csv")}>Download CSV</a>
              <a className={linkClass} href={exportPaths.transactions(range.from, range.to, "html")} target="_blank" rel="noreferrer">Open PDF report</a>
            </>
          )}
        </div>
        <p className="text-xs text-zinc-500">The CSV opens in Excel or Google Sheets. The report opens in a new tab; use Print, then Save as PDF.</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Privacy</h2>
        {agreedOn && <p className="text-sm text-zinc-600 dark:text-zinc-400">You agreed to how MoneyMania uses your data on {new Date(agreedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}. MoneyMania never sells your data, shows ads or offers loans.</p>}
        {consents.data
          ?.filter((c) => reminderLabels[c.purpose])
          .map((c) => (
            <label key={c.purpose} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={c.granted} onChange={(e) => toggle(c.purpose, e.target.checked)} /> {reminderLabels[c.purpose]}
            </label>
          ))}
        <ErrorText>{error ?? consents.error}</ErrorText>
        <div className="flex flex-wrap gap-3">
          <a className={linkClass} href={exportPaths.everything}>Download all my data</a>
          <Button variant="danger" onClick={deleteAccount}>Delete account and data</Button>
        </div>
      </Card>
    </>
  );
}
