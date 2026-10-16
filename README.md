# MoneyMania

The honest daily money app for Indian earners: log what comes in and goes out every day, plan bills, EMIs and savings against real cash flow, and get warned when a card EMI keeps charging interest after a refund. No loan offers, no ads.

Product plan: https://claude.ai/code/artifact/24ed6c3b-2236-4325-b048-7e08efdc9d2d

## Layout

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js web app, also serves the API and sign-in for mobile |
| `apps/mobile` | Expo (React Native) app for Android and iOS |
| `packages/core` | Shared money math: paise helpers, EMI and schedule calculations |
| `packages/db` | Prisma schema, migrations and database client (PostgreSQL) |

## Money rules

- Every amount is an integer number of **paise**. Never use floats for money.
- Rates are **basis points** (17% = 1700, 18% GST = 1800).
- All money math lives in `packages/core` and is unit tested.

## Getting started

Requires Node 22 and pnpm 10.

```bash
pnpm install
docker compose up -d                     # local Postgres
cp packages/db/.env.example packages/db/.env
cp apps/web/.env.example apps/web/.env.local   # set BETTER_AUTH_SECRET
pnpm --filter @moneymania/db migrate:dev
pnpm --filter @moneymania/web dev        # http://localhost:3000
pnpm --filter @moneymania/mobile start   # Expo dev server
```

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Deploying

The step-by-step account setup is in the beta launch checklist; this is the short version.

**Web and API (Vercel).** Import the repo with root directory `apps/web`. `apps/web/vercel.json` installs with pnpm, runs `prisma migrate deploy`, then builds, and schedules the daily reminder job. Set these environment variables:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres in Mumbai (ap-south-1); the pooled URL is fine |
| `DIRECT_URL` | Direct (unpooled) URL, used only by migrations; leave unset if `DATABASE_URL` is direct |
| `BETTER_AUTH_SECRET` | 32+ random characters |
| `BETTER_AUTH_URL` | Public address, e.g. `https://app.example.in` |
| `CRON_SECRET` | 32+ random characters; Vercel Cron sends it |
| `RESEND_API_KEY`, `REMINDER_FROM_EMAIL` | Reminder email; skipped when unset |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Shown on `/privacy`, `/terms` and `/delete-account` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google sign-in on the web |

`GET /api/health` returns 200 when the database is reachable, for uptime monitors.

**Mobile (EAS).** Run `npx eas-cli init` in `apps/mobile` once to link the Expo project (this also enables push), and set `EXPO_PUBLIC_API_URL` in the Expo project's preview and production environments.

- `eas build --profile preview --platform android` makes an installable APK for testers.
- `eas build --profile production --platform all --auto-submit` makes store builds and sends them to Play internal testing and TestFlight.
- With the `EXPO_TOKEN` secret set, the **Mobile build** GitHub workflow runs the same builds from the Actions tab.
