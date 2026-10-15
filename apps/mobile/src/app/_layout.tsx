import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="add-entry" options={{ presentation: "modal", headerShown: true, title: "Add entry" }} />
        <Stack.Screen name="accounts" options={{ headerShown: true, title: "Accounts" }} />
        <Stack.Screen name="emi/[id]" options={{ headerShown: true, title: "EMI" }} />
        <Stack.Screen name="add-bill" options={{ presentation: "modal", headerShown: true, title: "Add bill" }} />
        <Stack.Screen name="add-emi" options={{ presentation: "modal", headerShown: true, title: "Add EMI" }} />
        <Stack.Screen name="case/[id]" options={{ headerShown: true, title: "Refund case" }} />
        <Stack.Screen name="add-case" options={{ presentation: "modal", headerShown: true, title: "Open a refund case" }} />
      </Stack>
    </>
  );
}
