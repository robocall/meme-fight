import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const memes = sqliteTable("memes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  // Box file URL or shared link — populated when Box integration is added
  imageUrl: text("image_url").notNull(),
  elo: integer("elo").notNull().default(1500),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const votes = sqliteTable("votes", {
  id: text("id").primaryKey(),
  winnerId: text("winner_id")
    .notNull()
    .references(() => memes.id),
  loserId: text("loser_id")
    .notNull()
    .references(() => memes.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Meme = typeof memes.$inferSelect;
