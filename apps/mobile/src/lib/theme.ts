import { StyleSheet } from "react-native";

export const colors = {
  brand: "#059669",
  text: "#18181b",
  muted: "#71717a",
  border: "#d4d4d8",
  danger: "#dc2626",
  background: "#ffffff",
};

export const ui = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "center", gap: 12, backgroundColor: colors.background },
  title: { fontSize: 28, fontWeight: "600", color: colors.text },
  body: { fontSize: 16, color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: colors.text },
  button: { backgroundColor: colors.brand, borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  link: { color: colors.muted, textAlign: "center", textDecorationLine: "underline" },
  error: { color: colors.danger },
});
