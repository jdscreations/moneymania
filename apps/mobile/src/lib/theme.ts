import { StyleSheet } from "react-native";

export const colors = {
  brand: "#059669",
  income: "#059669",
  expense: "#e11d48",
  warning: "#d97706",
  text: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
  subtle: "#f4f4f5",
  danger: "#dc2626",
  background: "#ffffff",
};

export const ui = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "center", gap: 12, backgroundColor: colors.background },
  page: { padding: 16, gap: 12, backgroundColor: colors.background },
  title: { fontSize: 28, fontWeight: "600", color: colors.text },
  heading: { fontSize: 18, fontWeight: "600", color: colors.text },
  section: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 8 },
  body: { fontSize: 16, color: colors.muted },
  small: { fontSize: 12, color: colors.muted },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: colors.text },
  button: { backgroundColor: colors.brand, borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  ghostButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  link: { color: colors.muted, textAlign: "center", textDecorationLine: "underline" },
  error: { color: colors.danger },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
