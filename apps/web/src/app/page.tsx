import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">MoneyMania</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Log what you earn and spend every day, plan bills and EMIs against real cash flow, and get
        warned when a card EMI keeps charging interest after a refund.
      </p>
      <p className="text-sm text-zinc-500">No loan offers. No ads. Your data stays yours.</p>
      <div className="flex gap-3">
        <Link href="/sign-in" className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700">
          Get started
        </Link>
      </div>
    </main>
  );
}
