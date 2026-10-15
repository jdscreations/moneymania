import { formatINR } from "@moneymania/core";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-xl border border-zinc-200 p-4 dark:border-zinc-800", className)}>{children}</section>;
}

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      className={cx(
        "rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50",
        variant === "primary" && "bg-emerald-600 text-white hover:bg-emerald-700",
        variant === "ghost" && "border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900",
        variant === "danger" && "text-red-600 hover:bg-red-50 dark:hover:bg-red-950",
        className,
      )}
      {...props}
    />
  );
}

const field = "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(field, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(field, "dark:bg-zinc-950", props.className)} />;
}

export function Label({ children, text }: { children: ReactNode; text: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
      {text}
      {children}
    </label>
  );
}

export function Money({ paise, tone }: { paise: number; tone?: "income" | "expense" | "net" }) {
  const color =
    tone === "income" ? "text-emerald-600" : tone === "expense" ? "text-rose-600" : tone === "net" ? (paise < 0 ? "text-rose-600" : "text-emerald-600") : "";
  return <span className={cx("tabular-nums", color)}>{formatINR(paise)}</span>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p className="text-sm text-red-600">{children}</p> : null;
}
