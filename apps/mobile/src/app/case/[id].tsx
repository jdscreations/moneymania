import { caseEventTypes, formatINR, rupeesToPaise, todayIn, verdictCopy, type CaseEventInput, type CaseOrderDto, type OrderStatus, type OrderUpdate } from "@moneymania/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { deadlineText, fmtDate, orderStatusOptions } from "@/components/case";
import { Chips } from "@/components/chips";
import { Money } from "@/components/money";
import { api, useLoad } from "@/lib/api";
import { colors, ui } from "@/lib/theme";

const eventLabel: Record<(typeof caseEventTypes)[number], string> = {
  call: "Call",
  email: "Email",
  sr_number: "Request no.",
  promise: "Promise",
  escalation: "Escalation",
  note: "Note",
};

function Line({ label, paise, strong }: { label: string; paise: number; strong?: boolean }) {
  return (
    <View style={[ui.row, { justifyContent: "space-between", paddingVertical: 2 }]}>
      <Text style={strong ? { color: colors.text, fontWeight: "600" } : { color: colors.muted }}>{label}</Text>
      <Money paise={paise} style={strong ? { fontWeight: "600" } : undefined} />
    </View>
  );
}

/** Refund amount that saves when the field loses focus. */
function RefundField({ order, onSave }: { order: CaseOrderDto; onSave: (paise: number) => void }) {
  const [text, setText] = useState((order.refundPaise / 100).toFixed(2));
  return (
    <TextInput
      style={[ui.input, { flex: 1, paddingVertical: 8 }]}
      keyboardType="decimal-pad"
      value={text}
      onChangeText={setText}
      onEndEditing={() => {
        try {
          const paise = rupeesToPaise(text);
          if (paise !== order.refundPaise) onSave(paise);
        } catch {
          setText((order.refundPaise / 100).toFixed(2));
        }
      }}
    />
  );
}

export default function CaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useLoad(() => api.cases.get(id), [id]);
  const [eventType, setEventType] = useState<CaseEventInput["type"]>("call");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const c = data.data;
  if (!c) return data.error ? <Text style={[ui.page, ui.error]}>{data.error}</Text> : null;
  const a = c.analysis;
  const lender = c.emi?.lender ?? "the bank";
  const copy = a ? verdictCopy(a, lender) : null;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      data.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const updateOrder = (o: CaseOrderDto, patch: OrderUpdate) => run(() => api.cases.updateOrder(id, o.id, patch));
  const changeStatus = (o: CaseOrderDto, status: OrderStatus) =>
    updateOrder(o, { status, refundPaise: status === "kept" ? 0 : o.refundPaise || o.amountPaise, ...(status === "kept" ? { refundPostedOn: null } : {}) });

  function closeEmi(outcome: "foreclosed" | "cancelled") {
    const q = outcome === "foreclosed" ? `Record that you closed the ${lender} EMI today?` : `Record that ${lender} cancelled the EMI today?`;
    Alert.alert("Close the EMI", q, [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", onPress: () => void run(() => api.cases.closeEmi(id, { outcome, on: todayIn() })) },
    ]);
  }

  function remove() {
    Alert.alert("Delete case", `Delete ${c!.title}, its orders, log and EMI schedule?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.cases.remove(id);
          router.back();
        },
      },
    ]);
  }

  async function addEvent() {
    await run(() => api.cases.addEvent(id, { type: eventType, reference: reference || null, note: note || null, on: todayIn() }));
    setReference("");
    setNote("");
  }

  return (
    <ScrollView contentContainerStyle={[ui.page, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: c.title }} />
      <Text style={ui.small}>
        {formatINR(c.chargePaise)} charged on {fmtDate(c.chargedOn)}
        {c.emi ? ` · ${lender} EMI at ${(c.emi.annualRateBps / 100).toFixed(2)}% for ${c.emi.tenureMonths} months` : ""}
      </Text>
      <Text style={[ui.small, c.disputeDaysLeft !== null && c.disputeDaysLeft >= 0 && c.disputeDaysLeft <= 7 && { color: colors.warning, fontWeight: "600" }]}>
        {deadlineText(c.disputeDaysLeft, c.disputeDeadlineOn)}
      </Text>
      {error && <Text style={ui.error}>{error}</Text>}

      {a && copy && (
        <View style={[ui.card, a.verdict === "foreclose" && { borderColor: "#fcd34d", backgroundColor: "#fffbeb" }]}>
          <Text style={ui.heading}>{copy.headline}</Text>
          <Text style={[ui.body, { fontSize: 14, marginTop: 4 }]}>{copy.detail}</Text>
          {c.emi?.status === "active" && (
            <View style={[ui.row, { marginTop: 10, flexWrap: "wrap" }]}>
              <Pressable style={ui.ghostButton} onPress={() => closeEmi("foreclosed")}>
                <Text style={{ color: colors.text }}>I closed the EMI</Text>
              </Pressable>
              <Pressable style={ui.ghostButton} onPress={() => closeEmi("cancelled")}>
                <Text style={{ color: colors.text }}>Bank cancelled it</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {a && a.verdict !== "closed" && (
        <View style={ui.card}>
          <Line label="Keep the EMI: interest + GST to come" paise={a.keepCost} strong />
          <Line label="Close it today: fee, interest + GST" paise={a.foreclosure.cost} strong />
          <Text style={[ui.small, { marginBottom: 8 }]}>Closing grows about {formatINR(a.weeklyRise)} a week until the next statement.</Text>
          <Line label="Principal not yet billed" paise={a.outstanding} />
          <Line label="Foreclosure fee" paise={a.foreclosure.fee} />
          <Line label="GST on the fee" paise={a.foreclosure.feeGst} />
          <Line label="Interest since last statement" paise={a.foreclosure.accruedInterest} />
          <Line label="GST on that interest" paise={a.foreclosure.accruedGst} />
          <Line label="To pay the bank today" paise={a.foreclosure.payoff} strong />
          <Text style={[ui.small, { marginTop: 8 }]}>
            Refunds posted {formatINR(a.refundPosted)}, still on the way {formatINR(a.refundPending)}. You kept {formatINR(a.keptValue)} of {formatINR(a.ordersTotal)} ordered. Check the exact closing figure with the bank before paying.
          </Text>
        </View>
      )}

      <Text style={[ui.section, { marginTop: 4, marginBottom: 0 }]}>Orders</Text>
      {c.orders.map((o) => (
        <View key={o.id} style={[ui.card, { gap: 8 }]}>
          <View style={[ui.row, { justifyContent: "space-between" }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>{o.item}</Text>
              {o.merchantOrderId && <Text style={ui.small}>{o.merchantOrderId}</Text>}
            </View>
            <Money paise={o.amountPaise} />
          </View>
          <Chips value={o.status} onChange={(v) => void changeStatus(o, v as OrderStatus)} options={orderStatusOptions} />
          {o.status !== "kept" && (
            <View style={ui.row}>
              <Text style={ui.small}>Refund ₹</Text>
              <RefundField key={o.refundPaise} order={o} onSave={(refundPaise) => void updateOrder(o, { refundPaise })} />
              {o.refundPostedOn ? (
                <Pressable onPress={() => void updateOrder(o, { refundPostedOn: null })}>
                  <Text style={{ color: colors.income, fontSize: 12 }}>Posted {fmtDate(o.refundPostedOn)}</Text>
                </Pressable>
              ) : (
                <Pressable style={ui.ghostButton} onPress={() => void updateOrder(o, { refundPostedOn: todayIn() })}>
                  <Text style={{ color: colors.text, fontSize: 13 }}>Mark posted</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      ))}

      <View style={[ui.card, { gap: 8 }]}>
        <Text style={ui.section}>Case log</Text>
        <Chips value={eventType} onChange={(v) => setEventType(v as CaseEventInput["type"])} options={caseEventTypes.map((t) => ({ value: t, label: eventLabel[t] }))} />
        <TextInput style={ui.input} placeholder="Reference or request number" value={reference} onChangeText={setReference} autoCapitalize="none" />
        <TextInput style={ui.input} placeholder="What was said or promised" value={note} onChangeText={setNote} multiline />
        <Pressable style={[ui.button, !reference && !note && { opacity: 0.5 }]} disabled={!reference && !note} onPress={addEvent}>
          <Text style={ui.buttonText}>Add to log</Text>
        </Pressable>
        {c.events.map((e) => (
          <View key={e.id} style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.subtle }}>
            <Text style={ui.small}>
              {fmtDate(e.on)} · {eventLabel[e.type]}
              {e.reference ? ` · ${e.reference}` : ""}
            </Text>
            {e.note ? <Text style={{ color: colors.text }}>{e.note}</Text> : null}
          </View>
        ))}
      </View>

      {c.escalation.length > 0 && (
        <View style={[ui.card, { gap: 6 }]}>
          <Text style={ui.section}>If the bank says no</Text>
          {c.escalation.map((s, i) => (
            <View key={s.step}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {i + 1}. {s.step}
              </Text>
              <Text style={ui.small}>{s.how}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Pressable style={ui.ghostButton} onPress={() => void run(() => api.cases.update(id, { status: c.status === "open" ? "resolved" : "open" }))}>
          <Text style={{ color: colors.text }}>{c.status === "open" ? "Mark resolved" : "Reopen"}</Text>
        </Pressable>
        <Pressable onPress={remove}>
          <Text style={{ color: colors.danger }}>Delete case</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
