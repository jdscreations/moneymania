"use client";

import { rupeesToPaise, todayIn, type CategoryDto, type MoneyAccountDto, type TransactionInput } from "@moneymania/core";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button, cx, ErrorText, Input, Label, Select } from "./ui";

type Kind = "expense" | "income" | "transfer";

/** Quick add for one income, spend or transfer. */
export function EntryForm({ accounts, categories, onSaved }: { accounts: MoneyAccountDto[]; categories: CategoryDto[]; onSaved: () => void }) {
  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayIn());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const options = categories.filter((c) => c.kind === (kind === "income" ? "income" : "expense"));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let amountPaise: number;
    try {
      amountPaise = rupeesToPaise(amount);
    } catch {
      return setError("Enter an amount like 250 or 99.50");
    }
    const input: TransactionInput = {
      kind,
      amountPaise,
      accountId,
      occurredOn: date,
      categoryId: kind === "transfer" ? null : categoryId || null,
      transferAccountId: kind === "transfer" ? toAccountId : null,
      note: note || null,
    };
    setBusy(true);
    try {
      await api.transactions.create(input);
      setAmount("");
      setNote("");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm dark:bg-zinc-900">
        {(["expense", "income", "transfer"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => (setKind(k), setCategoryId(""))}
            className={cx("flex-1 rounded-md py-1.5 capitalize", kind === k && "bg-white font-medium shadow-sm dark:bg-zinc-800")}
          >
            {k === "expense" ? "Spent" : k === "income" ? "Earned" : "Transfer"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Label text="Amount (₹)">
          <Input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
        </Label>
        <Label text={kind === "transfer" ? "From" : "Account"}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </Label>
        {kind === "transfer" ? (
          <Label text="To">
            <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
              {accounts.filter((a) => a.id !== accountId).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Label>
        ) : (
          <Label text="Category">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Uncategorized</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Label>
        )}
        <Label text="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Label>
      </div>
      <div className="flex gap-3">
        <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        <Button disabled={busy || !accountId}>{busy ? "Saving…" : "Add"}</Button>
      </div>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}
