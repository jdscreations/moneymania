import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations need a direct connection; hosted Postgres often gives the app a pooled DATABASE_URL instead.
  datasource: { url: process.env.DIRECT_URL || env("DATABASE_URL") },
});
