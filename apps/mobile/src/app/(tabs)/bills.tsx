import { daysBetween, todayIn, type BillDto, type BillFrequency } from "@moneymania/core";
import { Link } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Money } from "@/components/money";
import { dueLabel } from "@/components/upcoming";
import { api, useLoad } from "@/lib/api";
import { colors, ui } from "@/lib/theme";

const freqLabel: Record<BillFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Every 3 months",
  half_yearly: "Every 6 months",
  yearly: "Yearly",
  once: "One time",
};

export default function Bills() {
  const bills = useLoad(() => api.bills.list(), []);
  const accounts = useLoad(() => api.accounts.list(), []);
  const today = todayIn();

  async function pay(b: BillDto) {
    await api.bills.pay(b.id, { accountId: b.accountId ?? accounts.data?.[0]?.id ?? null, paidOn: today });
    bills.reload();
  }

  function manage(b: BillDto) {
    Alert.alert(b.name, undefined, [
      { text: "Cancel", style: "cancel" },
      ...(b.nextDueOn ? [{ text: "Mark paid", onPress: () => void pay(b) }] : []),
      {
        text: "Stop tracking",
        style: "destructive" as const,
        onPress: async () => {
          await api.bills.remove(b.id);
          bills.reload();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[ui.page, { paddingBottom: 96 }]}>
        <View style={ui.card}>
          {bills.error && <Text style={ui.error}>{bills.error}</Text>}
          {bills.data?.length === 0 && <Text style={ui.small}>No bills yet. Add rent, electricity, phone, insurance and subscriptions.</Text>}
          {bills.data?.map((b) => (
            <Pressable key={b.id} onPress={() => manage(b)} style={[ui.row, { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.subtle }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>{b.name}</Text>
                <Text style={ui.small}>
                  {freqLabel[b.frequency]}
                  {b.autopay ? " · autopay" : ""}
                  {b.nextDueOn ? ` · ${dueLabel(daysBetween(today, b.nextDueOn))}` : " · done"}
                </Text>
              </View>
              <Money paise={b.amountPaise} />
            </Pressable>
          ))}
          {!!bills.data?.length && <Text style={[ui.small, { marginTop: 8 }]}>Tap a bill to mark it paid. Paying logs the spend and moves it to the next due date.</Text>}
        </View>
      </ScrollView>
      <Link href="/add-bill" asChild>
        <Pressable style={{ position: "absolute", right: 20, bottom: 20, backgroundColor: colors.brand, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 22 }}>
          <Text style={ui.buttonText}>+ Bill</Text>
        </Pressable>
      </Link>
    </View>
  );
}
