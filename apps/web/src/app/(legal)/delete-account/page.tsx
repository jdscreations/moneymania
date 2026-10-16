import type { Metadata } from "next";
import Link from "next/link";
import { SupportContact, supportEmail } from "@/components/support";

export const metadata: Metadata = { title: "Delete your account · MoneyMania" };

export default function DeleteAccount() {
  return (
    <>
      <h1>Delete your MoneyMania account</h1>
      <p>You can delete your account and all your data yourself, from the app or the website. It takes effect immediately.</p>

      <h2>In the phone app</h2>
      <ol>
        <li>Open MoneyMania and go to the Settings tab.</li>
        <li>Tap Delete account and data at the bottom.</li>
        <li>Confirm. You are signed out and everything is erased.</li>
      </ol>

      <h2>On the website</h2>
      <ol>
        <li>
          <Link className="text-emerald-700 underline dark:text-emerald-400" href="/settings">
            Sign in and open Settings
          </Link>
          .
        </li>
        <li>Click Delete account and data, then confirm.</li>
      </ol>

      <h2>What is deleted</h2>
      <p>
        Your profile, sign-in details, accounts, income and spending entries, budgets, bills, EMIs, refund cases, case logs, reminder settings and
        device tokens are all erased from the live database at once, and from backups within 30 days. Nothing is kept afterwards.
      </p>
      <p>Want a copy first? Use Download all my data in Settings before you delete.</p>

      <h2>Can&apos;t sign in?</h2>
      <p>
        {supportEmail ? (
          <>
            <SupportContact /> from the email address on the account, asking us to delete it. We will confirm and delete it within 7 days.
          </>
        ) : (
          <>Reset your password from the sign-in page, then follow the steps above.</>
        )}
      </p>
    </>
  );
}
