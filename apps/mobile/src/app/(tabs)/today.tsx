import { addDays, periodRange, todayIn, type Period } from "@moneymania/core";
import { Link } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Chips } from "@/components/chips";
import { Money } from "@/components/money";
import { Upcoming } from "@/components/upcoming";
import { api, useLoad } from "@/lib/api";
import { colors, ui } from "@/lib/theme";

const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", ...opts });

function shift(period: Period, date: string, dir: 1 | -1) {
  if (period === "day") return addDays(date, dir);
  if (period === "week") return addDays(date, 7 * dir);
  const { from, to } = periodRange("month", date);
  return dir === 1 ? addDays(to, 1) : periodRange("month", addDays(from, -1)).from;
}

function label(period: Period, date: string) {
  const { from, to } = periodRange(period, date);
  if (period === "day") return from === todayIn() ? "Today" : fmt(from, { weekday: "short", day: "numeric", month: "short" });
  if (period === "month") return fmt(from, { month: "long", year: "numeric" });
  return `${fmt(from, { day: "numeric", month: "short" })} to ${fmt(to, { day: "numeric", month: "short" })}`;
}

export default function Today() {
  const [period, setPeriod] = useState<Period>("day");
  const [date, setDate] = useState(todayIn());
  const { from, to } = periodRange(period, date);
  const setup = useLoad(() => Promise.all([api.accounts.list(), api.categories.list()]), []);
  const summary = useLoad(() => api.summary(period, date), [period, date]);
  const entries = useLoad(() => api.transactions.list(from, to), [from, to]);

  const [accounts, categories] = setup.data ?? [[], []];
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const acctName = new Map(accounts.map((a) => [a.id, a.name]));
  const s = summary.data;

  async function startWithCash() {
    await api.accounts.create({ type: "cash", name: "Cash" });
    setup.reload();
  }

  function remove(id: string) {
    Alert.alert("Delete this entry?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.transactions.remove(id);
          summary.reload();
          entries.reload();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[ui.page, { paddingBottom: 96 }]}>
        <View style={[ui.row, { justifyContent: "space-between" }]}>
          <Pressable style={ui.ghostButton} onPress={() => setDate(shift(period, date, -1))} accessibilityLabel="Previous">
            <Text>‹</Text>
          </Pressable>
          <Text style={ui.heading}>{label(period, date)}</Text>
          <Pressable style={ui.ghostButton} onPress={() => setDate(shift(period, date, 1))} accessibilityLabel="Next">
            <Text>›</Text>
          </Pressable>
        </View>
        <Chips
          value={period}
          onChange={(p) => setPeriod(p as Period)}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
        />
        <View style={[ui.row, { gap: 8 }]}>
          {[
            { label: "Earned", value: s?.incomePaise, tone: "income" as const },
            { label: "Spent", value: s?.expensePaise, tone: "expense" as const },
            { label: "Net", value: s?.netPaise, tone: "net" as const },
          ].map((t) => (
            <View key={t.label} style={[ui.card, { flex: 1, padding: 10 }]}>
              <Text style={ui.small}>{t.label}</Text>
              {t.value === undefined ? <Text>…</Text> : <Money paise={t.value} tone={t.tone} style={{ fontSize: 15, fontWeight: "600", marginTop: 4 }} />}
            </View>
          ))}
        </View>

        {setup.data && accounts.length === 0 && (
          <View style={[ui.card, { gap: 8 }]}>
            <Text style={ui.body}>Add where your money sits first. A cash wallet is enough to begin.</Text>
            <Pressable style={ui.button} onPress={startWithCash}>
              <Text style={ui.buttonText}>Add a cash wallet</Text>
            </Pressable>
          </View>
        )}

        <Upcoming />

        {s && s.expenseByCategory.length > 0 && (
          <View style={ui.card}>
            <Text style={ui.section}>Where it went</Text>
            {s.expenseByCategory.map((c) => (
              <View key={c.categoryId ?? "none"} style={[ui.row, { justifyContent: "space-between", paddingVertical: 4 }]}>
                <Text style={{ color: colors.text }}>{c.categoryId ? catName.get(c.categoryId) : "Uncategorized"}</Text>
                <Money paise={c.totalPaise} />
              </View>
            ))}
          </View>
        )}

        <View style={ui.card}>
          <Text style={ui.section}>Entries</Text>
          {entries.error && <Text style={ui.error}>{entries.error}</Text>}
          {entries.data?.length === 0 && <Text style={ui.small}>Nothing logged yet.</Text>}
          {entries.data?.map((t) => (
            <Pressable key={t.id} onLongPress={() => remove(t.id)} style={[ui.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.subtle }]}>
              <Text style={[ui.small, { width: 48 }]}>{fmt(t.occurredOn, { day: "numeric", month: "short" })}</Text>
              <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>
                {t.kind === "transfer"
                  ? `${acctName.get(t.accountId) ?? "Account"} to ${acctName.get(t.transferAccountId ?? "") ?? "account"}`
                  : t.categoryId
                    ? catName.get(t.categoryId)
                    : "Uncategorized"}
                {t.note ? <Text style={ui.small}> · {t.note}</Text> : null}
              </Text>
              <Money paise={t.kind === "expense" ? -t.amountPaise : t.amountPaise} tone={t.kind === "transfer" ? undefined : t.kind === "expense" ? "expense" : "income"} />
            </Pressable>
          ))}
          {!!entries.data?.length && <Text style={[ui.small, { marginTop: 8 }]}>Long-press an entry to delete it.</Text>}
        </View>
      </ScrollView>
      {accounts.length > 0 && (
        <Link href="/add-entry" asChild>
          <Pressable style={{ position: "absolute", right: 20, bottom: 20, backgroundColor: colors.brand, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 22 }}>
            <Text style={ui.buttonText}>+ Add</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}
