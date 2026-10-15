import { periodRange, todayIn, type ConsentPurpose } from "@moneymania/core";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { api, useLoad } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { openLegal } from "@/lib/legal";
import { registerForReminders } from "@/lib/push";
import { shareText, sharePdf } from "@/lib/share";
import { colors, ui } from "@/lib/theme";

const reminderLabels: Partial<Record<ConsentPurpose, string>> = {
  email_reminders: "Email reminders",
  push_reminders: "Phone notifications",
};

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={[ui.row, { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.subtle }]} onPress={onPress}>
      <Text style={{ color: colors.text, flex: 1 }}>{label}</Text>
      <Text style={ui.small}>›</Text>
    </Pressable>
  );
}

export default function Settings() {
  const { data: session } = authClient.useSession();
  const consents = useLoad(() => api.consents.list(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const month = periodRange("month", todayIn());
  const exportMonth = (format: "csv" | "pdf") =>
    run(async () => {
      if (format === "csv") await shareText(`moneymania-${month.from.slice(0, 7)}.csv`, await api.exports.transactions(month.from, month.to, "csv"), "text/csv");
      else await sharePdf(await api.exports.transactions(month.from, month.to, "html"));
    });
  const exportAll = () => run(async () => shareText(`moneymania-data-${todayIn()}.json`, await api.exports.everything(), "application/json"));

  async function toggle(purpose: ConsentPurpose, granted: boolean) {
    await run(() => api.consents.set({ purpose, granted }));
    if (purpose === "push_reminders" && granted) void registerForReminders();
    consents.reload();
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in");
  }

  function deleteAccount() {
    Alert.alert("Delete account?", "This deletes your account and all your data. It cannot be undone. You may want to download your data first.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await authClient.deleteUser();
          router.replace("/sign-in");
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={[ui.page, { paddingBottom: 48 }]}>
      <Text style={ui.body}>Signed in as {session?.user.email}</Text>

      <View style={ui.card}>
        <Text style={ui.section}>Tools</Text>
        <Row label="Calculators: EMI, savings goal, SIP, emergency fund" onPress={() => router.push("/calculators")} />
        <Row label="Accounts and balances" onPress={() => router.push("/accounts")} />
      </View>

      <View style={ui.card}>
        <Text style={ui.section}>Export this month</Text>
        <View style={[ui.row, { flexWrap: "wrap" }]}>
          <Pressable style={[ui.ghostButton, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => exportMonth("csv")}>
            <Text style={{ color: colors.text }}>Share CSV</Text>
          </Pressable>
          <Pressable style={[ui.ghostButton, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => exportMonth("pdf")}>
            <Text style={{ color: colors.text }}>Share PDF</Text>
          </Pressable>
        </View>
        <Text style={[ui.small, { marginTop: 6 }]}>For other dates, use Settings on the MoneyMania website.</Text>
      </View>

      <View style={[ui.card, { gap: 10 }]}>
        <Text style={ui.section}>Privacy</Text>
        <Text style={ui.small}>MoneyMania never sells your data, shows ads or offers loans.</Text>
        {consents.data
          ?.filter((c) => reminderLabels[c.purpose])
          .map((c) => (
            <View key={c.purpose} style={[ui.row, { justifyContent: "space-between" }]}>
              <Text style={{ color: colors.text }}>{reminderLabels[c.purpose]}</Text>
              <Switch value={c.granted} disabled={busy} onValueChange={(v) => void toggle(c.purpose, v)} />
            </View>
          ))}
        <Pressable style={[ui.ghostButton, busy && { opacity: 0.5 }]} disabled={busy} onPress={exportAll}>
          <Text style={{ color: colors.text, textAlign: "center" }}>Download all my data</Text>
        </Pressable>
        <View>
          <Row label="Privacy policy" onPress={() => void openLegal("/privacy")} />
          <Row label="Terms of use" onPress={() => void openLegal("/terms")} />
        </View>
      </View>
      {error && <Text style={ui.error}>{error}</Text>}

      <Pressable style={ui.button} onPress={signOut}>
        <Text style={ui.buttonText}>Sign out</Text>
      </Pressable>
      <Pressable onPress={deleteAccount}>
        <Text style={[ui.link, { color: colors.danger }]}>Delete account and data</Text>
      </Pressable>
    </ScrollView>
  );
}
