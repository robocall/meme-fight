import { createClient, type Client } from "@libsql/client";
import { eq, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import { getTursoConfig } from "./config";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  __memeFightClient?: Client;
  __memeFightDb?: Db;
};

function getClient(): Client {
  if (globalForDb.__memeFightClient) {
    return globalForDb.__memeFightClient;
  }

  const config = getTursoConfig();
  globalForDb.__memeFightClient = createClient(config);
  return globalForDb.__memeFightClient;
}

export function getDb(): Db {
  if (globalForDb.__memeFightDb) {
    return globalForDb.__memeFightDb;
  }

  globalForDb.__memeFightDb = drizzle(getClient(), { schema });
  return globalForDb.__memeFightDb;
}

export async function getMemeById(id: string) {
  return getDb().select().from(schema.memes).where(eq(schema.memes.id, id)).get();
}

export async function getAllMemes() {
  return getDb()
    .select()
    .from(schema.memes)
    .where(isNotNull(schema.memes.boxFileId))
    .all();
}

export async function getMemeBySourcePostId(sourcePostId: string) {
  return getDb()
    .select()
    .from(schema.memes)
    .where(eq(schema.memes.sourcePostId, sourcePostId))
    .get();
}
