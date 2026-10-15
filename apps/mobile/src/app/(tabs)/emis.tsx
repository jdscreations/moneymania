import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Money } from "@/components/money";
import { api, useLoad } from "@/lib/api";
import { colors, ui } from "@/lib/theme";

export default function Emis() {
  const emis = useLoad(() => api.emis.list(), []);
  const monthly = emis.data?.reduce((s, e) => s + (e.status === "active" && e.nextDue ? e.nextDue.emiPaise + e.nextDue.gstPaise : 0), 0) ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[ui.page, { paddingBottom: 96 }]}>
        <Text style={ui.body}>
          <Money paise={monthly} style={{ fontWeight: "600" }} /> due each month
        </Text>
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
