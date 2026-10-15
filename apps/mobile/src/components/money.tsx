import { formatINR } from "@moneymania/core";
import { Text, type TextStyle } from "react-native";
import { colors } from "@/lib/theme";

export function Money({ paise, tone, style }: { paise: number; tone?: "income" | "expense" | "net"; style?: TextStyle }) {
  const color =
    tone === "income" ? colors.income : tone === "expense" ? colors.expense : tone === "net" ? (paise < 0 ? colors.expense : colors.income) : colors.text;
  return <Text style={[{ color, fontVariant: ["tabular-nums"] }, style]}>{formatINR(paise)}</Text>;
}
