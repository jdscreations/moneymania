"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (result.error) setError(result.error.message ?? "Something went wrong");
    else router.push("/home");
  }

  const input = "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">{mode === "sign-in" ? "Sign in" : "Create your account"}</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "sign-up" && (
          <input className={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={input} type="password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <button className="text-sm text-zinc-600 underline" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>
        {mode === "sign-in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
