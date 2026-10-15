import { Redirect, router } from "expo-router";
import { Alert, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";
import { colors, ui } from "@/lib/theme";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return null;
  if (!session) return <Redirect href="/sign-in" />;

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in");
  }

  function deleteAccount() {
    Alert.alert("Delete account?", "This deletes your account and all your data. It cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await authClient.deleteUser();
          router.replace("/sign-in");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={ui.screen}>
      <Text style={ui.title}>Hi, {session.user.name}</Text>
      <Text style={ui.body}>
        You are signed in as {session.user.email}. Your daily log arrives in the next milestone.
      </Text>
      <Pressable style={ui.button} onPress={signOut}>
        <Text style={ui.buttonText}>Sign out</Text>
      </Pressable>
      <Pressable onPress={deleteAccount}>
        <Text style={[ui.link, { color: colors.danger }]}>Delete account</Text>
      </Pressable>
    </SafeAreaView>
  );
}
