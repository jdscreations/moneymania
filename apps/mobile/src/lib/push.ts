import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/**
 * Ask for notification permission and register this phone for bill and EMI reminders.
 * Quietly does nothing on simulators, when permission is refused, or before the app has an EAS project id.
 */
export async function registerForReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", { name: "Payment reminders", importance: Notifications.AndroidImportance.HIGH });
  }
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.pushTokens.register(data, Platform.OS === "ios" ? "ios" : "android");
  } catch (err) {
    console.warn("Could not register for reminders", err);
  }
}
