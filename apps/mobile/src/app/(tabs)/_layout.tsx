import { Redirect, Tabs } from "expo-router";
import type { ConsentDto } from "@moneymania/core";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { registerForReminders } from "@/lib/push";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const [consents, setConsents] = useState<{ data: ConsentDto[] | null; failed: boolean }>({ data: null, failed: false });

  useEffect(() => {
    if (!userId) return;
    let live = true;
    api.consents
      .list()
      .then((data) => live && setConsents({ data, failed: false }))
      .catch(() => live && setConsents({ data: null, failed: true }));
    return () => {
      live = false;
    };
  }, [userId]);

  const granted = (purpose: ConsentDto["purpose"]) => consents.data?.find((c) => c.purpose === purpose)?.granted ?? false;
  const wantsPush = granted("push_reminders");

  // Ask for notification permission only once the user has agreed to phone reminders.
  useEffect(() => {
    if (wantsPush) void registerForReminders();
  }, [wantsPush]);

  if (isPending) return null;
  if (!session) return <Redirect href="/sign-in" />;
  if (!consents.data && !consents.failed) return null;
  if (consents.data && !granted("data_processing")) return <Redirect href="/consent" />;

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
