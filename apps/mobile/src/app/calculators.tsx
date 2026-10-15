import { emergencyFund, formatINR, monthsToGoal, rupeesToPaise, savingsGoal, sipFutureValue, summarizeEmi, type CalculatorContextDto } from "@moneymania/core";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Chips } from "@/components/chips";
import { Money } from "@/components/money";
import { api, useLoad } from "@/lib/api";
import { colors, ui } from "@/lib/theme";

type Tab = "emi" | "goal" | "sip" | "emergency";
const tabs: { value: Tab; label: string }[] = [
  { value: "emi", label: "EMI" },
  { value: "goal", label: "Savings goal" },
  { value: "sip", label: "SIP" },
  { value: "emergency", label: "Emergency fund" },
];

function paise(text: string): number | null {
  try {
    return text.trim() ? rupeesToPaise(text) : null;
  } catch {
    return null;
  }
}
const bps = (text: string) => (text.trim() === "" || Number.isNaN(Number(text)) ? null : Math.round(Number(text) * 100));
const whole = (text: string) => (/^\d+$/.test(text.trim()) && Number(text) > 0 ? Number(text) : null);
const asRupees = (p: number) => String(Math.round(p / 100));

function Field({ label, value, onChange, decimal = true }: { label: string; value: string; onChange: (v: string) => void; decimal?: boolean }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={ui.small}>{label}</Text>
      <TextInput style={ui.input} keyboardType={decimal ? "decimal-pad" : "number-pad"} value={value} onChangeText={onChange} />
    </View>
  );
}

function Stat({ label, paise: p, text }: { label: string; paise?: number; text?: string }) {
  return (
    <View style={{ width: "48%", marginBottom: 8 }}>
      <Text style={ui.small}>{label}</Text>
      {p !== undefined ? <Money paise={p} style={{ fontSize: 18, fontWeight: "600" }} /> : <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text }}>{text}</Text>}
    </View>
  );
}

const resultBox = { backgroundColor: colors.subtle, borderRadius: 10, padding: 12, gap: 6 } as const;
const statsRow = { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" } as const;

function EmiCalc() {
  const [amount, setAmount] = useState("100000");
  const [rate, setRate] = useState("15");
  const [months, setMonths] = useState("12");
  const [gst, setGst] = useState(true);
  const p = paise(amount);
  const r = bps(rate);
  const n = whole(months);
  const s = p && p > 0 && r !== null && n ? summarizeEmi({ principal: p, annualRateBps: r, tenureMonths: n, gstOnInterestBps: gst ? 1800 : 0 }) : null;
  return (
    <>
      <Field label="Amount (₹)" value={amount} onChange={setAmount} />
      <Field label="Interest rate (% a year)" value={rate} onChange={setRate} />
      <Field label="Months" value={months} onChange={setMonths} decimal={false} />
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Text style={ui.body}>18% GST on interest (cards)</Text>
        <Switch value={gst} onValueChange={setGst} />
      </View>
      {s && (
        <View style={resultBox}>
          <View style={statsRow}>
            <Stat label="Monthly EMI" paise={s.emi} />
            <Stat label="Total interest" paise={s.totalInterest} />
            <Stat label="GST on interest" paise={s.totalGst} />
            <Stat label="Total you pay" paise={s.totalPaid} />
          </View>
        </View>
      )}
    </>
  );
}

function GoalCalc({ ctx }: { ctx: CalculatorContextDto | null }) {
  const [target, setTarget] = useState("200000");
  const [saved, setSaved] = useState("0");
  const [months, setMonths] = useState("24");
  const [rate, setRate] = useState("7");
  const t = paise(target);
  const s = paise(saved) ?? 0;
  const n = whole(months);
  const r = bps(rate) ?? 0;
  const res = t && n ? savingsGoal({ target: t, saved: s, months: n, annualReturnBps: r }) : null;
  const canSave = ctx && ctx.months > 0 ? ctx.avgMonthlyIncomePaise - ctx.avgMonthlySpendPaise : null;
  const atCurrent = t && canSave && canSave > 0 ? monthsToGoal(t, s, canSave, r) : null;
  return (
    <>
      <Field label="Goal (₹)" value={target} onChange={setTarget} />
      <Field label="Already saved (₹)" value={saved} onChange={setSaved} />
      <Field label="In how many months" value={months} onChange={setMonths} decimal={false} />
      <Field label="Return (% a year)" value={rate} onChange={setRate} />
      {res && (
        <View style={resultBox}>
          <View style={statsRow}>
            <Stat label="Save each month" paise={res.monthly} />
            <Stat label="Returns earned" paise={res.growth} />
          </View>
          {canSave !== null && (
            <Text style={ui.small}>
              {canSave > 0
                ? `You kept about ${formatINR(canSave)} a month lately.${atCurrent !== null ? ` Saving all of it reaches this goal in ${atCurrent} month${atCurrent === 1 ? "" : "s"}.` : ""}`
                : "You spent more than you earned lately, so this goal needs a cut in spending first."}
            </Text>
          )}
        </View>
      )}
    </>
  );
}

function SipCalc() {
  const [monthly, setMonthly] = useState("5000");
  const [rate, setRate] = useState("12");
  const [years, setYears] = useState("10");
  const [stepUp, setStepUp] = useState("0");
  const m = paise(monthly);
  const y = whole(years);
  const r = bps(rate);
  const res = m && m > 0 && y && r !== null ? sipFutureValue({ monthly: m, annualReturnBps: r, years: y, stepUpBps: bps(stepUp) ?? 0 }) : null;
  return (
    <>
      <Field label="Each month (₹)" value={monthly} onChange={setMonthly} />
      <Field label="Expected return (% a year)" value={rate} onChange={setRate} />
      <Field label="Years" value={years} onChange={setYears} decimal={false} />
      <Field label="Raise it each year by (%)" value={stepUp} onChange={setStepUp} />
      {res && (
        <View style={resultBox}>
          <View style={statsRow}>
            <Stat label="You invest" paise={res.invested} />
            <Stat label="Estimated value" paise={res.value} />
            <Stat label="Estimated gains" paise={res.gains} />
          </View>
          <Text style={ui.small}>Returns are not guaranteed; this assumes the same return every year.</Text>
        </View>
      )}
    </>
  );
}

function EmergencyCalc({ ctx }: { ctx: CalculatorContextDto | null }) {
  const startSpend = ctx ? ctx.avgMonthlySpendPaise || ctx.emiMonthlyPaise + ctx.billsMonthlyPaise : 0;
  const [spend, setSpend] = useState(startSpend ? asRupees(startSpend) : "");
  const [cover, setCover] = useState("6");
  const [available, setAvailable] = useState(ctx ? asRupees(Math.max(0, ctx.liquidPaise)) : "");
  const [build, setBuild] = useState("12");
  const sp = paise(spend);
  const c = whole(cover);
  const b = whole(build);
  const res = sp !== null && c && b ? emergencyFund({ monthlySpend: sp, monthsOfCover: c, available: paise(available) ?? 0, buildMonths: b }) : null;
  return (
    <>
      <Field label="Monthly spending (₹)" value={spend} onChange={setSpend} />
      <Field label="Months to cover" value={cover} onChange={setCover} decimal={false} />
      <Field label="Money you can reach now (₹)" value={available} onChange={setAvailable} />
      <Field label="Build the rest in (months)" value={build} onChange={setBuild} decimal={false} />
      {ctx && <Text style={ui.small}>Filled in from your recent spending and your cash, bank, UPI and wallet balances.</Text>}
      {res && (
        <View style={resultBox}>
          <View style={statsRow}>
            <Stat label="Target" paise={res.target} />
            <Stat label="Still to save" paise={res.shortfall} />
            <Stat label="Save each month" paise={res.monthly} />
            <Stat label="Covered today" text={`${res.monthsCovered} months`} />
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" }}>
            <View style={{ width: `${res.coveredBps / 100}%`, height: "100%", backgroundColor: colors.brand }} />
          </View>
        </View>
      )}
    </>
  );
}

export default function Calculators() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? "emi");
  const ctx = useLoad(() => api.calculatorContext(), []);
  return (
    <ScrollView contentContainerStyle={[ui.page, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
      <Chips value={tab} onChange={(v) => setTab(v as Tab)} options={tabs} />
      {tab === "emi" && <EmiCalc />}
      {tab === "goal" && <GoalCalc ctx={ctx.data} />}
      {tab === "sip" && <SipCalc />}
      {tab === "emergency" && (ctx.data || ctx.error ? <EmergencyCalc ctx={ctx.data} /> : <Text style={ui.small}>Loading your numbers…</Text>)}
    </ScrollView>
  );
}
