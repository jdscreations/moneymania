import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";
import { ui } from "@/lib/theme";

export default function SignIn() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (result.error) setError(result.error.message ?? "Something went wrong");
    else router.replace("/home");
  }

  return (
    <SafeAreaView style={ui.screen}>
      <Text style={ui.title}>{mode === "sign-in" ? "Sign in" : "Create your account"}</Text>
      {mode === "sign-up" && <TextInput style={ui.input} placeholder="Name" value={name} onChangeText={setName} />}
      <TextInput
        style={ui.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={ui.input}
        placeholder="Password (8+ characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={ui.error}>{error}</Text>}
      <Pressable style={[ui.button, busy && { opacity: 0.5 }]} disabled={busy} onPress={submit}>
        <Text style={ui.buttonText}>{busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}</Text>
      </Pressable>
      <Pressable onPress={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>
        <Text style={ui.link}>{mode === "sign-in" ? "New here? Create an account" : "Already have an account? Sign in"}</Text>
      </Pressable>
    </SafeAreaView>
  );
}
