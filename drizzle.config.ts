import { defineConfig } from "drizzle-kit";

import { loadLocalEnv } from "./src/lib/ingest/load-env";

loadLocalEnv();

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  throw new Error("Missing TURSO_DATABASE_URL. Add it to .env.local before running db:push.");
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
