import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { authClient } from "@/lib/auth-client";
import { ui } from "@/lib/theme";

export default function Index() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) {
    return (
      <View style={ui.screen}>
        <ActivityIndicator />
      </View>
    );
  }
  return <Redirect href={session ? "/home" : "/sign-in"} />;
}
