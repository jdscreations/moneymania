import Link from "next/link";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
        MoneyMania
      </Link>
      <article className="legal mt-4 flex flex-col gap-4 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</article>
      <nav className="mt-10 flex flex-wrap gap-4 border-t border-zinc-200 pt-4 text-sm text-zinc-500 dark:border-zinc-800">
        <Link href="/privacy" className="hover:underline">Privacy policy</Link>
        <Link href="/terms" className="hover:underline">Terms of use</Link>
        <Link href="/delete-account" className="hover:underline">Delete your account</Link>
      </nav>
    </main>
  );
}
