import { addDays, billFrequencies, isIsoDate, rupeesToPaise, todayIn, type BillFrequency } from "@moneymania/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Chips } from "@/components/chips";
import { api, useLoad } from "@/lib/api";
import { ui } from "@/lib/theme";

const freqLabel: Record<BillFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  yearly: "Yearly",
  once: "Once",
};

export default function AddBill() {
  const setup = useLoad(() => Promise.all([api.accounts.list(), api.categories.list()]), []);
  const [accounts, categories] = setup.data ?? [[], []];
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<BillFrequency>("monthly");
  const [nextDueOn, setNextDueOn] = useState(addDays(todayIn(), 7));
  const [categoryId, setCategoryId] = useState("cat_utilities");
  const [accountId, setAccountId] = useState("");
  const [autopay, setAutopay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!isIsoDate(nextDueOn)) return setError("Use a date like 2026-11-05");
    try {
      await api.bills.create({ name, amountPaise: rupeesToPaise(amount), frequency, nextDueOn, categoryId: categoryId || null, accountId: accountId || null, autopay });
      router.back();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
      <TextInput style={ui.input} placeholder="Name, e.g. Electricity" value={name} onChangeText={setName} autoFocus />
      <TextInput style={ui.input} placeholder="Amount (₹)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      <Text style={ui.small}>Repeats</Text>
      <Chips value={frequency} onChange={(f) => setFrequency(f as BillFrequency)} options={billFrequencies.map((f) => ({ value: f, label: freqLabel[f] }))} />
      <Text style={ui.small}>Next due (YYYY-MM-DD)</Text>
      <TextInput style={ui.input} value={nextDueOn} onChangeText={setNextDueOn} autoCapitalize="none" />
      <Text style={ui.small}>Category</Text>
      <Chips value={categoryId} onChange={setCategoryId} options={categories.filter((c) => c.kind === "expense").map((c) => ({ value: c.id, label: c.name }))} />
      <Text style={ui.small}>Paid from</Text>
      <Chips value={accountId} onChange={setAccountId} options={[{ value: "", label: "Choose when paying" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Text style={ui.body}>Paid automatically (autopay)</Text>
        <Switch value={autopay} onValueChange={setAutopay} />
      </View>
      {error && <Text style={ui.error}>{error}</Text>}
      <Pressable style={[ui.button, (!name || !amount) && { opacity: 0.5 }]} disabled={!name || !amount} onPress={save}>
        <Text style={ui.buttonText}>Save bill</Text>
      </Pressable>
    </ScrollView>
  );
}
