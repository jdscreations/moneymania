import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="add-entry" options={{ presentation: "modal", headerShown: true, title: "Add entry" }} />
      </Stack>
    </>
  );
}
