"use client";

import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function Settings() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  async function signOut() {
    await authClient.signOut();
    router.replace("/");
  }

  async function deleteAccount() {
    if (!confirm("Delete your account and all your data? This cannot be undone.")) return;
    await authClient.deleteUser();
    router.replace("/");
  }

  return (
    <>
      <h1 className="text-lg font-semibold">Settings</h1>
      <Card className="flex flex-col gap-3">
        <p className="text-sm">
          Signed in as <span className="font-medium">{session?.user.email}</span>
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
          <Button variant="danger" onClick={deleteAccount}>Delete account and data</Button>
        </div>
      </Card>
    </>
  );
}
