"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRefreshConsents } from "@/components/app-shell";
import { Button, Card, ErrorText } from "@/components/ui";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const promises = [
  "MoneyMania stores the accounts, income, spending, bills, EMIs and purchase cases you enter, only to show them back to you and work out your numbers.",
  "Your data is never sold or shared, and MoneyMania never shows ads or offers loans or cards.",
  "You can download everything at any time from Settings, and deleting your account erases it all.",
  "Reminders are optional, and you can turn them on or off later in Settings.",
];

export default function Consent() {
  const router = useRouter();
  const refreshConsents = useRefreshConsents();
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function agree() {
    setSaving(true);
    setError(null);
    try {
      await api.consents.set({ purpose: "data_processing", granted: true });
      await api.consents.set({ purpose: "email_reminders", granted: email });
      await api.consents.set({ purpose: "push_reminders", granted: push });
      await refreshConsents();
      router.replace("/home");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  async function decline() {
    await authClient.signOut();
    router.replace("/");
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Before you start</h1>
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">How MoneyMania uses your data</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          {promises.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Reminders</h2>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={email} onChange={(e) => setEmail(e.target.checked)} />
          <span>Email me about bills, EMIs and dispute deadlines that are coming up.</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={push} onChange={(e) => setPush(e.target.checked)} />
          <span>Send the same reminders to my phone when I use the app.</span>
        </label>
      </Card>
      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap gap-3">
        <Button onClick={agree} disabled={saving}>I agree, continue</Button>
        <Button variant="ghost" onClick={decline}>No thanks, sign out</Button>
      </div>
    </>
  );
}
