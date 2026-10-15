import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { verdictShort } from "@/components/case";
import { Money } from "@/components/money";
import { api, useLoad } from "@/lib/api";
import { colors, ui } from "@/lib/theme";

export default function Emis() {
  const emis = useLoad(() => api.emis.list(), []);
  const cases = useLoad(() => api.cases.list(), []);
  const monthly = emis.data?.reduce((s, e) => s + (e.status === "active" && e.nextDue ? e.nextDue.emiPaise + e.nextDue.gstPaise : 0), 0) ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[ui.page, { paddingBottom: 96 }]}>
        <Text style={ui.body}>
          <Money paise={monthly} style={{ fontWeight: "600" }} /> due each month
        </Text>
        <View style={ui.card}>
          <Text style={ui.section}>Refunds on EMI purchases</Text>
          {cases.error && <Text style={ui.error}>{cases.error}</Text>}
          {cases.data?.length === 0 && <Text style={ui.small}>Part of an EMI order cancelled or returned? Open a case to see whether to keep or close the EMI.</Text>}
          {cases.data?.map((c) => (
            <Link key={c.id} href={{ pathname: "/case/[id]", params: { id: c.id } }} asChild>
              <Pressable style={[ui.row, { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.subtle }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>{c.title}</Text>
                  <Text style={ui.small}>{c.analysis ? verdictShort[c.analysis.verdict] : ""}{c.status === "resolved" ? " · Resolved" : ""}</Text>
                </View>
                {c.analysis && c.analysis.verdict !== "closed" && (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={ui.small}>Keep <Money paise={c.analysis.keepCost} style={{ fontSize: 12 }} /></Text>
                    <Text style={ui.small}>Close <Money paise={c.analysis.foreclosure.cost} style={{ fontSize: 12 }} /></Text>
                  </View>
                )}
              </Pressable>
            </Link>
          ))}
          <Link href="/add-case" asChild>
            <Pressable style={[ui.ghostButton, { marginTop: 8, alignSelf: "flex-start" }]}>
              <Text style={{ color: colors.text }}>Open a refund case</Text>
            </Pressable>
          </Link>
        </View>
        <View style={ui.card}>
          {emis.error && <Text style={ui.error}>{emis.error}</Text>}
          {emis.data?.length === 0 && <Text style={ui.small}>No EMIs yet.</Text>}
          {emis.data?.map((e) => (
            <Link key={e.id} href={{ pathname: "/emi/[id]", params: { id: e.id } }} asChild>
              <Pressable style={[ui.row, { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.subtle }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>{e.name}</Text>
                  <Text style={ui.small}>
                    {e.lender} · {e.paidCount} of {e.tenureMonths} paid{e.status !== "active" ? ` · ${e.status}` : ""}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Money paise={e.emiPaise} />
                  <Text style={ui.small}>
                    <Money paise={e.outstandingPaise} style={{ fontSize: 12, color: colors.muted }} /> left
                  </Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
      <Link href="/add-emi" asChild>
        <Pressable style={{ position: "absolute", right: 20, bottom: 20, backgroundColor: colors.brand, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 22 }}>
          <Text style={ui.buttonText}>+ EMI</Text>
        </Pressable>
      </Link>
    </View>
  );
}
