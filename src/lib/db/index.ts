import Database from "better-sqlite3";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";

import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "meme_fight.db");

const SEED_MEMES = [
  { title: "Drake Hotline Bling", imageUrl: "https://picsum.photos/seed/drake/600/600" },
  { title: "Distracted Boyfriend", imageUrl: "https://picsum.photos/seed/distracted/600/600" },
  { title: "Woman Yelling at Cat", imageUrl: "https://picsum.photos/seed/cat/600/600" },
  { title: "Expanding Brain", imageUrl: "https://picsum.photos/seed/brain/600/600" },
  { title: "This Is Fine", imageUrl: "https://picsum.photos/seed/fine/600/600" },
  { title: "Surprised Pikachu", imageUrl: "https://picsum.photos/seed/pikachu/600/600" },
];

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  __memeFightDb?: Db;
};

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
      elo INTEGER NOT NULL DEFAULT 1500,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      winner_id TEXT NOT NULL REFERENCES memes(id),
      loser_id TEXT NOT NULL REFERENCES memes(id),
      created_at INTEGER NOT NULL
    )
  `);

  const [{ value: memeCount }] = db.select({ value: count() }).from(schema.memes).all();
  if (memeCount === 0) {
    const now = new Date();
    db.insert(schema.memes)
      .values(
        SEED_MEMES.map((meme) => ({
          id: crypto.randomUUID(),
          title: meme.title,
          imageUrl: meme.imageUrl,
          elo: 1500,
          wins: 0,
          losses: 0,
          createdAt: now,
        })),
      )
      .run();
  }

  globalForDb.__memeFightDb = db;
  return db;
}

export function getDb() {
  return initDb();
}

export function getMemeById(id: string) {
  return getDb().select().from(schema.memes).where(eq(schema.memes.id, id)).get();
}

export function getAllMemes() {
  return getDb().select().from(schema.memes).all();
}
