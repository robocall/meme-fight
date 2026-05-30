import Database from "better-sqlite3";
import { eq, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";

import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "meme_fight.db");

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  __memeFightDb?: Db;
};

function ensureMemesColumns(sqlite: Database.Database) {
  const columns = sqlite.prepare("PRAGMA table_info(memes)").all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("box_file_id")) {
    sqlite.exec("ALTER TABLE memes ADD COLUMN box_file_id TEXT");
  }

  if (!columnNames.has("source_post_id")) {
    sqlite.exec("ALTER TABLE memes ADD COLUMN source_post_id TEXT");
  }

  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS memes_source_post_id_unique
    ON memes(source_post_id)
    WHERE source_post_id IS NOT NULL
  `);
}

function initDb(): Db {
  if (globalForDb.__memeFightDb) {
    return globalForDb.__memeFightDb;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });

  db.run(`
    CREATE TABLE IF NOT EXISTS memes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      box_file_id TEXT,
      elo INTEGER NOT NULL DEFAULT 1500,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);
  ensureMemesColumns(sqlite);
  purgePlaceholderMemes(sqlite);
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      winner_id TEXT NOT NULL REFERENCES memes(id),
      loser_id TEXT NOT NULL REFERENCES memes(id),
      created_at INTEGER NOT NULL
    )
  `);

  globalForDb.__memeFightDb = db;
  return db;
}

function purgePlaceholderMemes(sqlite: Database.Database) {
  sqlite.exec(`
    DELETE FROM votes
    WHERE winner_id IN (SELECT id FROM memes WHERE box_file_id IS NULL)
       OR loser_id IN (SELECT id FROM memes WHERE box_file_id IS NULL)
  `);
  sqlite.exec("DELETE FROM memes WHERE box_file_id IS NULL");
}

export function getDb() {
  return initDb();
}

export function getMemeById(id: string) {
  return getDb().select().from(schema.memes).where(eq(schema.memes.id, id)).get();
}

export function getAllMemes() {
  return getDb()
    .select()
    .from(schema.memes)
    .where(isNotNull(schema.memes.boxFileId))
    .all();
}

export function getMemeBySourcePostId(sourcePostId: string) {
  return getDb()
    .select()
    .from(schema.memes)
    .where(eq(schema.memes.sourcePostId, sourcePostId))
    .get();
}
