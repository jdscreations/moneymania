"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ConsentDto } from "@moneymania/core";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const nav = [
  { href: "/home", label: "Today" },
  { href: "/bills", label: "Bills" },
  { href: "/emis", label: "EMIs" },
  { href: "/refunds", label: "Refunds" },
  { href: "/calculators", label: "Calculators" },
  { href: "/accounts", label: "Accounts" },
  { href: "/budgets", label: "Budgets" },
  { href: "/settings", label: "Settings" },
] as const;

const ConsentRefresh = createContext<() => Promise<void>>(async () => {});
/** Reloads the consents the app shell gates on, e.g. right after the user agrees. */
export const useRefreshConsents = () => useContext(ConsentRefresh);

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const [consents, setConsents] = useState<{ data: ConsentDto[] | null; error: string | null }>({ data: null, error: null });
  useEffect(() => {
    if (!userId) return;
    let live = true;
    api.consents
      .list()
      .then((data) => live && setConsents({ data, error: null }))
      .catch((err: Error) => live && setConsents({ data: null, error: err.message }));
    return () => {
      live = false;
    };
  }, [userId]);
  const refresh = useCallback(async () => setConsents({ data: await api.consents.list(), error: null }), []);
  const agreed = consents.data?.find((c) => c.purpose === "data_processing")?.granted;
  const onConsent = pathname === "/consent";

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in");
  }, [isPending, session, router]);

  // Nothing is shown until the user has agreed to how MoneyMania uses their data.
  useEffect(() => {
    if (consents.data && !agreed && !onConsent) router.replace("/consent");
  }, [consents.data, agreed, onConsent, router]);

  if (!session) return null;
  if (onConsent)
    return (
      <ConsentRefresh.Provider value={refresh}>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">{children}</main>
      </ConsentRefresh.Provider>
    );
  if (!agreed && !consents.error) return null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-1 overflow-x-auto px-4 py-3">
          <span className="mr-4 font-semibold">MoneyMania</span>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cx(
                "rounded-lg px-3 py-1.5 text-sm whitespace-nowrap",
                pathname.startsWith(n.href) ? "bg-zinc-100 font-medium dark:bg-zinc-800" : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900",
              )}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6">{children}</main>
    </div>
  );
}
