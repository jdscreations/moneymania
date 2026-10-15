import { addDays, isIsoDate, rupeesToPaise, todayIn } from "@moneymania/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput } from "react-native";
import { Chips } from "@/components/chips";
import { api, useLoad } from "@/lib/api";
import { ui } from "@/lib/theme";

type Kind = "expense" | "income" | "transfer";

export default function AddEntry() {
  const setup = useLoad(() => Promise.all([api.accounts.list(), api.categories.list()]), []);
  const [accounts, categories] = setup.data ?? [[], []];
  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayIn());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = accountId || accounts[0]?.id || "";
  const destinations = accounts.filter((a) => a.id !== from);
  const to = toAccountId && toAccountId !== from ? toAccountId : (destinations[0]?.id ?? "");
  const options = categories.filter((c) => c.kind === (kind === "income" ? "income" : "expense"));

  async function save() {
    setError(null);
    let amountPaise: number;
    try {
      amountPaise = rupeesToPaise(amount);
    } catch {
      return setError("Enter an amount like 250 or 99.50");
    }
    if (!isIsoDate(date)) return setError("Use a date like 2026-10-15");
    setBusy(true);
    try {
      await api.transactions.create({
        kind,
        amountPaise,
        accountId: from,
        occurredOn: date,
        categoryId: kind === "transfer" ? null : categoryId || null,
        transferAccountId: kind === "transfer" ? to : null,
        note: note || null,
      });
      router.back();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const today = todayIn();

  return (
    <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
      <Chips
        value={kind}
        onChange={(k) => {
          setKind(k as Kind);
          setCategoryId("");
        }}
        options={[
          { value: "expense", label: "Spent" },
          { value: "income", label: "Earned" },
          { value: "transfer", label: "Transfer" },
        ]}
      />
      <TextInput style={[ui.input, { fontSize: 28 }]} placeholder="₹0" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} autoFocus />
      <Text style={ui.small}>{kind === "transfer" ? "From" : "Account"}</Text>
      <Chips value={from} onChange={setAccountId} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
      {kind === "transfer" ? (
        <>
          <Text style={ui.small}>To</Text>
          {destinations.length === 0 ? (
            <Text style={ui.error}>Add a second account to make a transfer.</Text>
          ) : (
            <Chips value={to} onChange={setToAccountId} options={destinations.map((a) => ({ value: a.id, label: a.name }))} />
          )}
        </>
      ) : (
        <>
          <Text style={ui.small}>Category</Text>
          <Chips value={categoryId} onChange={setCategoryId} options={[{ value: "", label: "Uncategorized" }, ...options.map((c) => ({ value: c.id, label: c.name }))]} />
        </>
      )}
      <Text style={ui.small}>Date</Text>
      <Chips
        value={date === today ? "today" : date === addDays(today, -1) ? "yesterday" : "other"}
        onChange={(v) => v !== "other" && setDate(v === "today" ? today : addDays(today, -1))}
        options={[
          { value: "today", label: "Today" },
          { value: "yesterday", label: "Yesterday" },
          { value: "other", label: "Other date" },
        ]}
      />
      <TextInput style={ui.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
      <TextInput style={ui.input} placeholder="Note (optional)" value={note} onChangeText={setNote} maxLength={200} />
      {error && <Text style={ui.error}>{error}</Text>}
      <Pressable style={[ui.button, (busy || !from) && { opacity: 0.5 }]} disabled={busy || !from} onPress={save}>
        <Text style={ui.buttonText}>{busy ? "Saving…" : "Save"}</Text>
      </Pressable>
    </ScrollView>
  );
}
