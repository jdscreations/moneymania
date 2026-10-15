import { expo } from "@better-auth/expo";
import { prisma } from "@moneymania/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : undefined;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  socialProviders: google ? { google } : {},
  // Users can delete their own account and all its data (DPDP right to erasure).
  user: { deleteUser: { enabled: true } },
  // The mobile app talks to this same server; its deep-link scheme must be trusted.
  trustedOrigins: ["moneymania://", ...(process.env.EXTRA_TRUSTED_ORIGINS?.split(",") ?? [])],
  plugins: [expo()],
});
