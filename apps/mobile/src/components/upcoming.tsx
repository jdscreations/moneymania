import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { api, useLoad } from "@/lib/api";
import { colors, ui } from "@/lib/theme";
import { Money } from "./money";

export const dueLabel = (days: number) => (days < 0 ? `${-days}d overdue` : days === 0 ? "Due today" : days === 1 ? "Tomorrow" : `In ${days} days`);

/** Bills, EMIs and dispute deadlines in the next two weeks, overdue first. */
export function Upcoming() {
  const { data } = useLoad(() => api.upcoming(14), []);
  if (!data || data.length === 0) return null;
  return (
    <View style={ui.card}>
      <Text style={ui.section}>Coming up</Text>
      {data.map((u) => (
        <Link key={`${u.type}-${u.id}-${u.dueOn}`} href={u.type === "bill" ? "/bills" : u.type === "dispute" ? { pathname: "/case/[id]", params: { id: u.id } } : { pathname: "/emi/[id]", params: { id: u.id } }} asChild>
          <Pressable style={[ui.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.subtle }]}>
            <Text style={[ui.small, { width: 84, color: u.daysLeft < 0 ? colors.expense : u.daysLeft <= 2 ? colors.warning : colors.muted }]}>{dueLabel(u.daysLeft)}</Text>
            <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>
              {u.name}
            </Text>
            {u.type !== "dispute" && <Money paise={u.amountPaise} />}
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
