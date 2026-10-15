import { addDays, isIsoDate, merchants, rupeesToPaise, todayIn, type CaseInput, type OrderStatus } from "@moneymania/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { orderStatusOptions } from "@/components/case";
import { Chips } from "@/components/chips";
import { api } from "@/lib/api";
import { colors, ui } from "@/lib/theme";

const merchantLabel: Record<CaseInput["merchant"], string> = { amazon_in: "Amazon.in", flipkart: "Flipkart", other: "Other store" };

interface OrderRow {
  item: string;
  merchantOrderId: string;
  price: string;
  status: OrderStatus;
  refund: string;
}
const emptyOrder = (): OrderRow => ({ item: "", merchantOrderId: "", price: "", status: "kept", refund: "" });

export default function AddCase() {
  const today = todayIn();
  const [title, setTitle] = useState("");
  const [merchant, setMerchant] = useState<CaseInput["merchant"]>("amazon_in");
  const [bank, setBank] = useState("sbi");
  const [otherBank, setOtherBank] = useState("");
  const [feePct, setFeePct] = useState("3");
  const [disputeDays, setDisputeDays] = useState("45");
  const [charge, setCharge] = useState("");
  const [chargedOn, setChargedOn] = useState(today);
  const [firstStatementOn, setFirstStatementOn] = useState(addDays(today, 18));
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("12");
  const [processingFee, setProcessingFee] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([emptyOrder()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setOrder = (i: number, patch: Partial<OrderRow>) => setOrders((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const filled = orders.filter((o) => o.item.trim());
  const ready = !!charge && rate !== "" && filled.length > 0 && filled.every((o) => o.price);

  async function save() {
    setError(null);
    if (!isIsoDate(chargedOn) || !isIsoDate(firstStatementOn)) return setError("Use dates like 2026-10-07");
    setSaving(true);
    try {
      const other = bank === "other";
      const created = await api.cases.create({
        title,
        merchant,
        bankCode: other ? otherBank.trim() || "other" : "sbi",
        chargePaise: rupeesToPaise(charge),
        chargedOn,
        firstStatementOn,
        annualRateBps: Math.round(Number(rate) * 100),
        tenureMonths: Number(tenure),
        processingFeePaise: processingFee ? rupeesToPaise(processingFee) : 0,
        foreclosureFeeBps: other ? Math.round(Number(feePct) * 100) : undefined,
        disputeWindowDays: other && disputeDays ? Number(disputeDays) : undefined,
        orders: filled.map((o) => ({
          item: o.item,
          merchantOrderId: o.merchantOrderId || null,
          amountPaise: rupeesToPaise(o.price),
          status: o.status,
          refundPaise: o.status === "kept" ? 0 : rupeesToPaise(o.refund || o.price),
        })),
      });
      router.replace({ pathname: "/case/[id]", params: { id: created.id } });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
      <TextInput style={ui.input} placeholder="Name, e.g. Festival sale orders" value={title} onChangeText={setTitle} />
      <Chips value={merchant} onChange={(m) => setMerchant(m as CaseInput["merchant"])} options={merchants.map((m) => ({ value: m, label: merchantLabel[m] }))} />
      <Chips value={bank} onChange={setBank} options={[{ value: "sbi", label: "SBI Card" }, { value: "other", label: "Another bank" }]} />
      {bank === "other" && (
        <>
          <TextInput style={ui.input} placeholder="Bank name, e.g. HDFC" value={otherBank} onChangeText={setOtherBank} />
          <Text style={ui.small}>Fee to close the EMI early (%)</Text>
          <TextInput style={ui.input} keyboardType="decimal-pad" value={feePct} onChangeText={setFeePct} />
          <Text style={ui.small}>Days to raise a dispute</Text>
          <TextInput style={ui.input} keyboardType="number-pad" value={disputeDays} onChangeText={setDisputeDays} />
        </>
      )}
      <TextInput style={ui.input} placeholder="Card charge converted to EMI (₹)" keyboardType="decimal-pad" value={charge} onChangeText={setCharge} />
      <Text style={ui.small}>Charged on (YYYY-MM-DD)</Text>
      <TextInput style={ui.input} value={chargedOn} onChangeText={setChargedOn} autoCapitalize="none" />
      <Text style={ui.small}>Statement with the first EMI (YYYY-MM-DD)</Text>
      <TextInput style={ui.input} value={firstStatementOn} onChangeText={setFirstStatementOn} autoCapitalize="none" />
      <TextInput style={ui.input} placeholder="Interest rate (% a year)" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
      <TextInput style={ui.input} placeholder="Months" keyboardType="number-pad" value={tenure} onChangeText={setTenure} />
      <TextInput style={ui.input} placeholder="Processing fee (₹), optional" keyboardType="decimal-pad" value={processingFee} onChangeText={setProcessingFee} />

      <Text style={[ui.section, { marginTop: 8, marginBottom: 0 }]}>Orders in this charge</Text>
      {orders.map((o, i) => (
        <View key={i} style={[ui.card, { gap: 8 }]}>
          <TextInput style={ui.input} placeholder="Item" value={o.item} onChangeText={(v) => setOrder(i, { item: v })} />
          <View style={ui.row}>
            <TextInput style={[ui.input, { flex: 3 }]} placeholder="Order ID" value={o.merchantOrderId} onChangeText={(v) => setOrder(i, { merchantOrderId: v })} autoCapitalize="none" />
            <TextInput style={[ui.input, { flex: 2 }]} placeholder="Price ₹" keyboardType="decimal-pad" value={o.price} onChangeText={(v) => setOrder(i, { price: v })} />
          </View>
          <Chips value={o.status} onChange={(v) => setOrder(i, { status: v as OrderStatus })} options={orderStatusOptions} />
          {o.status !== "kept" && (
            <TextInput style={ui.input} placeholder="Refund ₹ (empty means the full price)" keyboardType="decimal-pad" value={o.refund} onChangeText={(v) => setOrder(i, { refund: v })} />
          )}
          {orders.length > 1 && (
            <Pressable onPress={() => setOrders((rows) => rows.filter((_, j) => j !== i))}>
              <Text style={{ color: colors.danger }}>Remove order</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Pressable style={[ui.ghostButton, { alignSelf: "flex-start" }]} onPress={() => setOrders((rows) => [...rows, emptyOrder()])}>
        <Text style={{ color: colors.text }}>Add another order</Text>
      </Pressable>

      {error && <Text style={ui.error}>{error}</Text>}
      <Pressable style={[ui.button, (!ready || saving) && { opacity: 0.5 }]} disabled={!ready || saving} onPress={save}>
        <Text style={ui.buttonText}>Open case</Text>
      </Pressable>
    </ScrollView>
  );
}
