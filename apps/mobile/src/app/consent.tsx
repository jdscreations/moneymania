import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { colors, ui } from "@/lib/theme";

const promises = [
  "MoneyMania stores the accounts, income, spending, bills, EMIs and purchase cases you enter, only to show them back to you and work out your numbers.",
  "Your data is never sold or shared, and MoneyMania never shows ads or offers loans or cards.",
  "You can download everything at any time from Settings, and deleting your account erases it all.",
  "Reminders are optional, and you can turn them on or off later in Settings.",
];

export default function Consent() {
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
      router.replace("/");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  async function decline() {
    await authClient.signOut();
    router.replace("/sign-in");
  }

  return (
    <ScrollView contentContainerStyle={[ui.page, { paddingTop: 64 }]}>
      <Text style={ui.title}>Before you start</Text>
      <View style={[ui.card, { gap: 8 }]}>
        <Text style={ui.section}>How MoneyMania uses your data</Text>
        {promises.map((p) => (
          <Text key={p} style={{ color: colors.text }}>
            • {p}
          </Text>
        ))}
      </View>
      <View style={[ui.card, { gap: 12 }]}>
        <Text style={ui.section}>Reminders</Text>
        <View style={[ui.row, { justifyContent: "space-between" }]}>
          <Text style={{ color: colors.text, flex: 1 }}>Email me about bills, EMIs and dispute deadlines</Text>
          <Switch value={email} onValueChange={setEmail} />
        </View>
        <View style={[ui.row, { justifyContent: "space-between" }]}>
          <Text style={{ color: colors.text, flex: 1 }}>Send the same reminders to this phone</Text>
          <Switch value={push} onValueChange={setPush} />
        </View>
      </View>
      {error && <Text style={ui.error}>{error}</Text>}
      <Pressable style={[ui.button, saving && { opacity: 0.5 }]} disabled={saving} onPress={agree}>
        <Text style={ui.buttonText}>I agree, continue</Text>
      </Pressable>
      <Pressable onPress={decline}>
        <Text style={ui.link}>No thanks, sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
