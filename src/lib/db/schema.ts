import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const memes = sqliteTable("memes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  boxFileId: text("box_file_id"),
  sourcePostId: text("source_post_id"),
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

export const memeInsights = sqliteTable("meme_insights", {
  memeId: text("meme_id")
    .primaryKey()
    .references(() => memes.id),
  boxFileId: text("box_file_id").notNull(),
  insightsJson: text("insights_json"),
  errorMessage: text("error_message"),
  status: text("status").notNull(),
  extractedAt: integer("extracted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const memesSourcePostIdUnique = uniqueIndex("memes_source_post_id_unique")
  .on(memes.sourcePostId)
  .where(sql`${memes.sourcePostId} is not null`);

export type Meme = typeof memes.$inferSelect;
export type MemeInsight = typeof memeInsights.$inferSelect;
export type MemeInsightStatus = "pending" | "ready" | "failed";
