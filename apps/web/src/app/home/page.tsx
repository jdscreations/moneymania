"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in");
  }, [isPending, session, router]);

  if (!session) return null;

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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Hi, {session.user.name}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        You are signed in as {session.user.email}. Your daily log arrives in the next milestone.
      </p>
      <div className="flex gap-3">
        <button onClick={signOut} className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700">
          Sign out
        </button>
        <button onClick={deleteAccount} className="rounded-lg px-4 py-2 text-red-600">
          Delete account
        </button>
      </div>
    </main>
  );
}
