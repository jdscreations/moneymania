"use client";

import { moneyAccountTypes, rupeesToPaise, type MoneyAccountInput } from "@moneymania/core";
import { useState } from "react";
import { Button, Card, ErrorText, Input, Label, Money, Select } from "@/components/ui";
import { api, useLoad } from "@/lib/api";

const typeLabel: Record<(typeof moneyAccountTypes)[number], string> = {
  cash: "Cash",
  bank: "Bank account",
  upi: "UPI",
  credit_card: "Credit card",
  wallet: "Wallet",
};

export default function Accounts() {
  const accounts = useLoad(() => api.accounts.list(), []);
  const [type, setType] = useState<MoneyAccountInput["type"]>("bank");
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.accounts.create({ type, name, openingBalancePaise: opening ? rupeesToPaise(opening) : 0 });
      setName("");
      setOpening("");
      accounts.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function archive(id: string) {
    if (!confirm("Hide this account? Its past entries stay in your history.")) return;
    await api.accounts.archive(id);
    accounts.reload();
  }

  const total = accounts.data?.reduce((s, a) => s + (a.type === "credit_card" ? 0 : a.balancePaise), 0) ?? 0;

  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Accounts</h1>
        <p className="text-sm text-zinc-500">
          Cash and bank total <Money paise={total} />
        </p>
      </div>
      <Card>
        <ErrorText>{accounts.error}</ErrorText>
        {accounts.data?.length === 0 && <p className="text-sm text-zinc-500">No accounts yet.</p>}
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {accounts.data?.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="flex-1">
                {a.name} <span className="text-xs text-zinc-500">{typeLabel[a.type]}</span>
              </span>
              <Money paise={a.balancePaise} />
              <button onClick={() => archive(a.id)} className="text-xs text-zinc-400 hover:text-red-600">Hide</button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Add an account</h2>
        <form onSubmit={add} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Label text="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as MoneyAccountInput["type"])}>
              {moneyAccountTypes.map((t) => (
                <option key={t} value={t}>{typeLabel[t]}</option>
              ))}
            </Select>
          </Label>
          <Label text="Name">
            <Input placeholder="SBI savings" value={name} onChange={(e) => setName(e.target.value)} required />
          </Label>
          <Label text="Current balance (₹)">
            <Input inputMode="decimal" placeholder="0" value={opening} onChange={(e) => setOpening(e.target.value)} />
          </Label>
          <div className="flex items-end">
            <Button className="w-full">Add account</Button>
          </div>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>
    </>
  );
}
