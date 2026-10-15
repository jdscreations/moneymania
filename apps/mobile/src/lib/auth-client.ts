import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

/** The MoneyMania API (the Next.js web app). Set EXPO_PUBLIC_API_URL for devices and builds. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [expoClient({ scheme: "moneymania", storagePrefix: "moneymania", storage: SecureStore })],
});
