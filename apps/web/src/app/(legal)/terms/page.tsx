import type { Metadata } from "next";
import { SupportContact } from "@/components/support";

export const metadata: Metadata = { title: "Terms of use · MoneyMania" };

export default function Terms() {
  return (
    <>
      <h1>Terms of use</h1>
      <p className="text-sm text-zinc-500">Last updated 15 October 2026</p>
      <p>By creating a MoneyMania account you agree to these terms. If you do not agree, please do not use the app.</p>

      <h2>What MoneyMania is</h2>
      <p>
        MoneyMania helps you record and understand your own money. It is a tracking and planning tool, not a bank, lender, payment service or
        investment adviser. It does not move money, offer credit or recommend financial products.
      </p>

      <h2>Calculations are estimates</h2>
      <p>
        EMI schedules, foreclosure costs, refund savings and calculator results follow published bank methods and the figures you enter, but
        banks can differ in rounding, dates and charges. Always confirm the exact amount with your bank before you pay or close a loan. We are not
        responsible for decisions made on these estimates.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or over and give a real email address.</li>
        <li>Keep your password private. You are responsible for what happens in your account.</li>
        <li>Enter only your own information, or information you are allowed to record.</li>
        <li>Do not misuse the service, try to reach other people&apos;s data, or overload it.</li>
      </ul>

      <h2>Your data</h2>
      <p>
        What you enter stays yours. Our <a className="text-emerald-700 underline dark:text-emerald-400" href="/privacy">privacy policy</a> explains
        how we handle it. You can download or delete it at any time.
      </p>

      <h2>Beta</h2>
      <p>
        MoneyMania is in beta. Features may change, and the service may sometimes be unavailable. Download your data regularly if you rely on it.
        The app is free during the beta.
      </p>

      <h2>Ending your use</h2>
      <p>You can delete your account whenever you like. We may suspend accounts that break these terms.</p>

      <h2>Liability</h2>
      <p>
        The service is provided as it is. To the extent Indian law allows, we are not liable for indirect losses, or for losses from relying on an
        estimate without checking it with your bank.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of India.</p>

      <h2>Contact</h2>
      <p>
        For questions about these terms, <SupportContact fallback="contact us through the app" />.
      </p>
    </>
  );
}
