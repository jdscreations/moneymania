/** Public support inbox, set per deployment with NEXT_PUBLIC_SUPPORT_EMAIL. */
export const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || null;

/** "write to support@…" as a mail link, or the in-app route when no inbox is configured. */
export function SupportContact({ fallback = "use Settings in the app" }: { fallback?: string }) {
  return supportEmail ? (
    <>
      write to{" "}
      <a className="font-medium text-emerald-700 underline dark:text-emerald-400" href={`mailto:${supportEmail}`}>
        {supportEmail}
      </a>
    </>
  ) : (
    <>{fallback}</>
  );
}
