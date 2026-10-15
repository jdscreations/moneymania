import { addDays, periodRange, rupeesToPaise, todayIn } from "@moneymania/core";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Chips } from "@/components/chips";
import { Money } from "@/components/money";
import { api, useLoad } from "@/lib/api";
import { colors, ui } from "@/lib/theme";

export default function Budgets() {
  const [month, setMonth] = useState(todayIn().slice(0, 7));
  const budgets = useLoad(() => api.budgets.list(month), [month]);
  const categories = useLoad(() => api.categories.list(), []);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const spending = categories.data?.filter((c) => c.kind === "expense") ?? [];
  const name = new Map(spending.map((c) => [c.id, c.name]));
  const from = `${month}-01`;
  const label = new Date(`${from}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
  const move = (dir: 1 | -1) => setMonth((dir === 1 ? addDays(periodRange("month", from).to, 1) : periodRange("month", addDays(from, -1)).from).slice(0, 7));

  async function save() {
    setError(null);
    try {
      await api.budgets.set({ categoryId, month, limitPaise: rupeesToPaise(limit) });
      setLimit("");
      budgets.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Pressable style={ui.ghostButton} onPress={() => move(-1)} accessibilityLabel="Previous month">
          <Text>‹</Text>
        </Pressable>
        <Text style={ui.heading}>{label}</Text>
        <Pressable style={ui.ghostButton} onPress={() => move(1)} accessibilityLabel="Next month">
          <Text>›</Text>
        </Pressable>
      </View>
      <View style={[ui.card, { gap: 14 }]}>
        {budgets.data?.length === 0 && <Text style={ui.small}>No budgets for this month yet.</Text>}
        {budgets.data?.map((b) => {
          const used = b.spentPaise / b.limitPaise;
          const bar = used > 1 ? colors.expense : used > 0.8 ? colors.warning : colors.income;
          return (
            <View key={b.id} style={{ gap: 4 }}>
              <View style={[ui.row, { justifyContent: "space-between" }]}>
                <Text style={{ fontWeight: "600", color: colors.text }}>{name.get(b.categoryId) ?? "Category"}</Text>
                <Text style={ui.small}>
                  <Money paise={b.spentPaise} style={{ fontSize: 12 }} /> of <Money paise={b.limitPaise} style={{ fontSize: 12 }} />
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.subtle, overflow: "hidden" }}>
                <View style={{ height: 8, width: `${Math.min(100, used * 100)}%`, backgroundColor: bar }} />
              </View>
            </View>
          );
        })}
      </View>
      <View style={[ui.card, { gap: 10 }]}>
        <Text style={ui.section}>Set a budget</Text>
        <Chips value={categoryId} onChange={setCategoryId} options={spending.map((c) => ({ value: c.id, label: c.name }))} />
        <TextInput style={ui.input} placeholder="Monthly limit (₹)" keyboardType="decimal-pad" value={limit} onChangeText={setLimit} />
        {error && <Text style={ui.error}>{error}</Text>}
        <Pressable style={[ui.button, (!categoryId || !limit) && { opacity: 0.5 }]} disabled={!categoryId || !limit} onPress={save}>
          <Text style={ui.buttonText}>Save budget</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
