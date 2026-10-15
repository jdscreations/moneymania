import type { Metadata } from "next";
import { SupportContact } from "@/components/support";

export const metadata: Metadata = { title: "Privacy policy · MoneyMania" };

export default function Privacy() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="text-sm text-zinc-500">Last updated 15 October 2026</p>
      <p>
        MoneyMania is a personal money tracker. You type in your own income, spending, bills, EMIs and refund cases, and the app shows them back to
        you with totals, reminders and calculations. This policy explains what we keep, why, and the control you have, in line with India&apos;s
        Digital Personal Data Protection Act, 2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Your name, email address and password (stored only as a secure hash).</li>
        <li>The money records you enter: accounts, income, spending, budgets, bills, EMIs, orders, refunds and notes about calls with your bank.</li>
        <li>Your consent choices, with the date you gave or withdrew each one.</li>
        <li>If you allow phone reminders, a push notification token for your device.</li>
        <li>Basic technical logs (time, address of the request, errors), kept to run and secure the service.</li>
      </ul>
      <p>
        We do not read your SMS, bank statements, contacts or location, we do not connect to your bank, and we never ask for card numbers, CVVs,
        UPI PINs or bank passwords.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To show your records back to you and work out totals, EMI schedules, refund savings and calculator results.</li>
        <li>To send the bill, EMI and dispute-deadline reminders you turned on, by email or phone notification.</li>
        <li>To keep your account secure and the service running.</li>
      </ul>
      <p>We process your data only with your consent, which you give when you first sign in. We do not show ads, sell or rent your data, or use it to offer loans or cards.</p>

      <h2>Who else handles it</h2>
      <p>We use a few service providers who process data only on our instructions:</p>
      <ul>
        <li>Vercel, which hosts the app.</li>
        <li>Our database provider, which stores your data in its Mumbai (India) region.</li>
        <li>Resend, which delivers reminder emails, if you turned them on.</li>
        <li>Expo, Apple and Google, which deliver phone notifications, if you turned them on.</li>
      </ul>
      <p>We share data with authorities only when Indian law requires it.</p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>Turn email or phone reminders on or off at any time in Settings.</li>
        <li>Download everything you have entered from Settings, as a file you can keep.</li>
        <li>Correct any record by editing it in the app.</li>
        <li>Delete your account from Settings. That erases your account and every record at once.</li>
        <li>Withdraw your consent to processing by deleting your account.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while you have an account. When you delete it, it is erased from the live database immediately, and from our hosting
        provider&apos;s backups within 30 days.
      </p>

      <h2>Security</h2>
      <p>All traffic uses HTTPS. Passwords are hashed, sessions expire, and each person can only ever see their own records.</p>

      <h2>Children</h2>
      <p>MoneyMania is for people aged 18 and over.</p>

      <h2>Questions and complaints</h2>
      <p>
        For any question, correction or complaint about your data, <SupportContact fallback="contact us through the app" />. We reply within 7
        days. If you are not satisfied, you can complain to the Data Protection Board of India.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that affects you, we will tell you in the app before the change applies.</p>
    </>
  );
}
