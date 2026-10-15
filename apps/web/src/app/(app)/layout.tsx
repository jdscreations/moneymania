import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

// Everything signed-in reads the URL and session on the client, so render it inside a Suspense boundary.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
