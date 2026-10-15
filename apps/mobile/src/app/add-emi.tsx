import { emiKinds, isIsoDate, monthlyEmi, rupeesToPaise, todayIn, type EmiInput } from "@moneymania/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Chips } from "@/components/chips";
import { Money } from "@/components/money";
import { api } from "@/lib/api";
import { ui } from "@/lib/theme";

const kindLabel: Record<EmiInput["kind"], string> = {
  card_merchant: "Card EMI on a purchase",
  card_conversion: "Card bill to EMI",
  loan: "Loan",
  bnpl: "Pay later",
};

export default function AddEmi() {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<EmiInput["kind"]>("card_merchant");
  const [lender, setLender] = useState("");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("12");
  const [firstDueOn, setFirstDueOn] = useState(todayIn());
  const [alreadyPaid, setAlreadyPaid] = useState("0");
  const [gst, setGst] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let preview: number | null = null;
  try {
    preview = amount && rate !== "" && Number(tenure) > 0 ? monthlyEmi({ principal: rupeesToPaise(amount), annualRateBps: Math.round(Number(rate) * 100), tenureMonths: Number(tenure) }) : null;
  } catch {
    preview = null;
  }

  async function save() {
    setError(null);
    if (!isIsoDate(firstDueOn)) return setError("Use a date like 2026-11-07");
    try {
      const emi = await api.emis.create({
        name,
        kind,
        lender,
        principalPaise: rupeesToPaise(amount),
        annualRateBps: Math.round(Number(rate) * 100),
        tenureMonths: Number(tenure),
        firstDueOn,
        alreadyPaid: Number(alreadyPaid) || 0,
        gstOnInterestBps: gst ? 1800 : 0,
      });
      router.replace({ pathname: "/emi/[id]", params: { id: emi.id } });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
      <TextInput style={ui.input} placeholder="Name, e.g. Amazon order" value={name} onChangeText={setName} autoFocus />
      <Chips value={kind} onChange={(k) => setKind(k as EmiInput["kind"])} options={emiKinds.map((k) => ({ value: k, label: kindLabel[k] }))} />
      <TextInput style={ui.input} placeholder="Bank or lender, e.g. SBI Card" value={lender} onChangeText={setLender} />
      <TextInput style={ui.input} placeholder="Amount converted (₹)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      <TextInput style={ui.input} placeholder="Interest rate (% a year)" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
      <TextInput style={ui.input} placeholder="Months" keyboardType="number-pad" value={tenure} onChangeText={setTenure} />
      <Text style={ui.small}>First EMI date (YYYY-MM-DD)</Text>
      <TextInput style={ui.input} value={firstDueOn} onChangeText={setFirstDueOn} autoCapitalize="none" />
      <Text style={ui.small}>EMIs already paid</Text>
      <TextInput style={ui.input} keyboardType="number-pad" value={alreadyPaid} onChangeText={setAlreadyPaid} />
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Text style={ui.body}>18% GST on interest (cards)</Text>
        <Switch value={gst} onValueChange={setGst} />
      </View>
      {preview !== null && (
        <Text style={ui.body}>
          Monthly EMI about <Money paise={preview} style={{ fontWeight: "600" }} /> before GST
        </Text>
      )}
      {error && <Text style={ui.error}>{error}</Text>}
      <Pressable style={[ui.button, (!name || !lender || !amount || rate === "") && { opacity: 0.5 }]} disabled={!name || !lender || !amount || rate === ""} onPress={save}>
        <Text style={ui.buttonText}>Save EMI</Text>
      </Pressable>
    </ScrollView>
  );
}
