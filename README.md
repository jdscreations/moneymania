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
