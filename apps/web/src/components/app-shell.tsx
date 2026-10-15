"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { cx } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

const nav = [
  { href: "/home", label: "Today" },
  { href: "/bills", label: "Bills" },
  { href: "/emis", label: "EMIs" },
  { href: "/refunds", label: "Refunds" },
  { href: "/accounts", label: "Accounts" },
  { href: "/budgets", label: "Budgets" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in");
  }, [isPending, session, router]);

  if (!session) return null;

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
