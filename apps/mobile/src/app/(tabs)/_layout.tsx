import { Redirect, Tabs } from "expo-router";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { registerForReminders } from "@/lib/push";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  const { data: session, isPending } = authClient.useSession();
  const signedIn = !!session;

  useEffect(() => {
    if (signedIn) void registerForReminders();
  }, [signedIn]);

  if (isPending) return null;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.brand, headerTitleStyle: { fontWeight: "600" } }}>
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen name="bills" options={{ title: "Bills" }} />
      <Tabs.Screen name="emis" options={{ title: "EMIs" }} />
      <Tabs.Screen name="budgets" options={{ title: "Budgets" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
