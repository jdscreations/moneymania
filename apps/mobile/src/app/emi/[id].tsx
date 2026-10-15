import { rupeesToPaise, todayIn, type PrepaymentDto } from "@moneymania/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Chips } from "@/components/chips";
import { Money } from "@/components/money";
import { api, useLoad } from "@/lib/api";
import { colors, ui } from "@/lib/theme";

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "2-digit" });

export default function EmiDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const emi = useLoad(() => api.emis.get(id), [id]);
  const accounts = useLoad(() => api.accounts.list(), []);
  const [payFrom, setPayFrom] = useState("");
  const [prepay, setPrepay] = useState("");
  const [mode, setMode] = useState<"reduce_tenure" | "reduce_emi">("reduce_tenure");
  const [whatIf, setWhatIf] = useState<PrepaymentDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const e = emi.data;
  if (!e) return emi.error ? <Text style={[ui.page, ui.error]}>{emi.error}</Text> : null;

  async function payNext() {
    if (!e?.nextDue) return;
    setError(null);
    try {
      await api.emis.payInstallment(id, e.nextDue.number, { paidOn: todayIn(), accountId: payFrom || null });
      emi.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function runWhatIf() {
    setError(null);
    try {
      setWhatIf(await api.emis.prepayment(id, { amountPaise: rupeesToPaise(prepay), mode }));
    } catch (err) {
      setWhatIf(null);
      setError((err as Error).message);
    }
  }

  function remove() {
    Alert.alert(`Delete ${e!.name}?`, "Its schedule is deleted too.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.emis.remove(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: e.name }} />
      <Text style={ui.small}>
        {e.lender} · {(e.annualRateBps / 100).toFixed(2)}% · {e.tenureMonths} months{e.gstOnInterestBps > 0 ? ` · ${e.gstOnInterestBps / 100}% GST on interest` : ""}
      </Text>
      <View style={[ui.row, { gap: 8 }]}>
        {[
          { label: "EMI", value: e.emiPaise },
          { label: "Principal left", value: e.outstandingPaise },
          { label: "Interest + GST left", value: e.remainingCostPaise },
        ].map((t) => (
          <View key={t.label} style={[ui.card, { flex: 1, padding: 10 }]}>
            <Text style={ui.small}>{t.label}</Text>
            <Money paise={t.value} style={{ fontWeight: "600", marginTop: 4 }} />
          </View>
        ))}
      </View>

      {e.nextDue && (
        <View style={[ui.card, { gap: 8 }]}>
          <Text style={ui.section}>
            Next: EMI {e.nextDue.number} on {fmt(e.nextDue.dueOn)}
          </Text>
          <Money paise={e.nextDue.emiPaise + e.nextDue.gstPaise} style={{ fontSize: 20, fontWeight: "600" }} />
          <Text style={ui.small}>Log it as spending from</Text>
          <Chips value={payFrom} onChange={setPayFrom} options={[{ value: "", label: "Don't log" }, ...(accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }))]} />
          <Pressable style={ui.button} onPress={payNext}>
            <Text style={ui.buttonText}>Mark paid</Text>
          </Pressable>
        </View>
      )}

      {e.status === "active" && e.paidCount < e.tenureMonths - 1 && (
        <View style={[ui.card, { gap: 8 }]}>
          <Text style={ui.section}>What if I prepay?</Text>
          <TextInput style={ui.input} placeholder="Prepay now (₹)" keyboardType="decimal-pad" value={prepay} onChangeText={setPrepay} />
          <Chips
            value={mode}
            onChange={(m) => setMode(m as typeof mode)}
            options={[
              { value: "reduce_tenure", label: "Finish sooner" },
              { value: "reduce_emi", label: "Lower the EMI" },
            ]}
          />
          <Pressable style={[ui.ghostButton, { alignItems: "center" }]} onPress={runWhatIf} disabled={!prepay}>
            <Text style={{ color: colors.text }}>Calculate</Text>
          </Pressable>
          {whatIf && (
            <Text style={ui.body}>
              You save <Money paise={whatIf.saved} tone="income" />. EMI becomes <Money paise={whatIf.newEmi} /> for {whatIf.newRemainingMonths} more months. Bank fees not included.
            </Text>
          )}
        </View>
      )}
      {error && <Text style={ui.error}>{error}</Text>}

      <View style={ui.card}>
        <Text style={ui.section}>Schedule</Text>
        {e.installments.map((i) => (
          <View key={i.number} style={[ui.row, { paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.subtle, opacity: i.paidOn ? 0.5 : 1 }]}>
            <Text style={[ui.small, { width: 24 }]}>{i.number}</Text>
            <Text style={{ flex: 1, color: colors.text }}>{fmt(i.dueOn)}</Text>
            <Text style={[ui.small, { width: 44 }]}>{i.paidOn ? "Paid" : ""}</Text>
            <Money paise={i.emiPaise + i.gstPaise} />
          </View>
        ))}
      </View>

      <Pressable onPress={remove}>
        <Text style={[ui.link, { color: colors.danger }]}>Delete this EMI</Text>
      </Pressable>
    </ScrollView>
  );
}
