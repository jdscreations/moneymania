import { moneyAccountTypes, rupeesToPaise } from "@moneymania/core";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Chips } from "@/components/chips";
import { Money } from "@/components/money";
import { api, useLoad } from "@/lib/api";
import { colors, ui } from "@/lib/theme";

const typeLabel: Record<(typeof moneyAccountTypes)[number], string> = {
  cash: "Cash",
  bank: "Bank",
  upi: "UPI",
  credit_card: "Credit card",
  wallet: "Wallet",
};

export default function Accounts() {
  const accounts = useLoad(() => api.accounts.list(), []);
  const [type, setType] = useState<(typeof moneyAccountTypes)[number]>("bank");
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add() {
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

  function archive(id: string) {
    Alert.alert("Hide this account?", "Its past entries stay in your history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Hide",
        onPress: async () => {
          await api.accounts.archive(id);
          accounts.reload();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
      <View style={ui.card}>
        {accounts.error && <Text style={ui.error}>{accounts.error}</Text>}
        {accounts.data?.length === 0 && <Text style={ui.small}>No accounts yet.</Text>}
        {accounts.data?.map((a) => (
          <Pressable key={a.id} onLongPress={() => archive(a.id)} style={[ui.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.subtle }]}>
            <Text style={{ flex: 1, color: colors.text }}>
              {a.name} <Text style={ui.small}>{typeLabel[a.type]}</Text>
            </Text>
            <Money paise={a.balancePaise} />
          </Pressable>
        ))}
      </View>
      <View style={[ui.card, { gap: 10 }]}>
        <Text style={ui.section}>Add an account</Text>
        <Chips value={type} onChange={(t) => setType(t as typeof type)} options={moneyAccountTypes.map((t) => ({ value: t, label: typeLabel[t] }))} />
        <TextInput style={ui.input} placeholder="Name, e.g. SBI savings" value={name} onChangeText={setName} />
        <TextInput style={ui.input} placeholder="Current balance (₹)" keyboardType="decimal-pad" value={opening} onChangeText={setOpening} />
        {error && <Text style={ui.error}>{error}</Text>}
        <Pressable style={[ui.button, !name && { opacity: 0.5 }]} disabled={!name} onPress={add}>
          <Text style={ui.buttonText}>Add account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
