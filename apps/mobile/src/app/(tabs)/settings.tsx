import { Link, router } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { authClient } from "@/lib/auth-client";
import { colors, ui } from "@/lib/theme";

export default function Settings() {
  const { data: session } = authClient.useSession();

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
    <View style={[ui.page, { flex: 1 }]}>
      <Text style={ui.body}>Signed in as {session?.user.email}</Text>
      <Link href="/accounts" asChild>
        <Pressable style={ui.ghostButton}>
          <Text style={{ color: colors.text, textAlign: "center" }}>Accounts and balances</Text>
        </Pressable>
      </Link>
      <Pressable style={ui.button} onPress={signOut}>
        <Text style={ui.buttonText}>Sign out</Text>
      </Pressable>
      <Pressable onPress={deleteAccount}>
        <Text style={[ui.link, { color: colors.danger }]}>Delete account and data</Text>
      </Pressable>
    </View>
  );
}
