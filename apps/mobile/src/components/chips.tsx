import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { colors } from "@/lib/theme";

export interface ChipOption {
  value: string;
  label: string;
}

/** A horizontal row of choices; works the same on Android and iOS without a native picker. */
export function Chips({ options, value, onChange }: { options: ChipOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, active && styles.active]}>
            <Text style={[styles.text, active && styles.activeText]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  active: { backgroundColor: colors.brand, borderColor: colors.brand },
  text: { color: colors.text, fontSize: 14 },
  activeText: { color: "#ffffff", fontWeight: "600" },
});
