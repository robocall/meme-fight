import { desc, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { memeInsights, memes, type MemeInsightStatus } from "@/lib/db/schema";

export type MemeInsightData = {
  overlay_text?: string;
  meme_format?: string;
  subjects?: string;
  humor_style?: string;
  summary?: string;
  why_funny?: string;
};

export type TopMemeWithInsight = {
  id: string;
  title: string;
  elo: number;
  wins: number;
  losses: number;
  boxFileId: string;
  insight: {
    status: MemeInsightStatus;
    data: MemeInsightData | null;
    errorMessage: string | null;
    extractedAt: Date | null;
  } | null;
};

export async function getInsightByMemeId(memeId: string) {
  return getDb().select().from(memeInsights).where(eq(memeInsights.memeId, memeId)).get();
}

export async function markInsightPending(memeId: string, boxFileId: string) {
  const now = new Date();

  await getDb()
    .insert(memeInsights)
    .values({
      memeId,
      boxFileId,
      status: "pending",
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: memeInsights.memeId,
      set: {
        boxFileId,
        status: "pending",
        insightsJson: null,
        errorMessage: null,
        extractedAt: null,
      },
    });
}

export async function saveInsightReady(memeId: string, data: MemeInsightData) {
  await getDb()
    .update(memeInsights)
    .set({
      status: "ready",
      insightsJson: JSON.stringify(data),
      errorMessage: null,
      extractedAt: new Date(),
    })
    .where(eq(memeInsights.memeId, memeId));
}

export async function saveInsightFailed(memeId: string, errorMessage: string) {
  await getDb()
    .update(memeInsights)
    .set({
      status: "failed",
      errorMessage,
      extractedAt: new Date(),
    })
    .where(eq(memeInsights.memeId, memeId));
}

export async function getTopMemesForInsights(limit: number, skipReady = false) {
  const rows = await getDb()
    .select({
      id: memes.id,
      title: memes.title,
      elo: memes.elo,
      wins: memes.wins,
      losses: memes.losses,
      boxFileId: memes.boxFileId,
      insightStatus: memeInsights.status,
    })
    .from(memes)
    .leftJoin(memeInsights, eq(memes.id, memeInsights.memeId))
    .where(isNotNull(memes.boxFileId))
    .orderBy(desc(memes.elo), desc(memes.wins))
    .limit(limit)
    .all();

  if (!skipReady) {
    return rows.filter((row) => row.boxFileId !== null);
  }

  return rows.filter(
    (row) => row.boxFileId !== null && row.insightStatus !== "ready",
  );
}

export async function getTopMemesWithInsights(limit: number): Promise<TopMemeWithInsight[]> {
  const rows = await getDb()
    .select({
      id: memes.id,
      title: memes.title,
      elo: memes.elo,
      wins: memes.wins,
      losses: memes.losses,
      boxFileId: memes.boxFileId,
      insightStatus: memeInsights.status,
      insightsJson: memeInsights.insightsJson,
      errorMessage: memeInsights.errorMessage,
      extractedAt: memeInsights.extractedAt,
    })
    .from(memes)
    .leftJoin(memeInsights, eq(memes.id, memeInsights.memeId))
    .where(isNotNull(memes.boxFileId))
    .orderBy(desc(memes.elo), desc(memes.wins))
    .limit(limit)
    .all();

  return rows
    .filter((row): row is typeof row & { boxFileId: string } => row.boxFileId !== null)
    .map((row) => ({
      id: row.id,
      title: row.title,
      elo: row.elo,
      wins: row.wins,
      losses: row.losses,
      boxFileId: row.boxFileId,
      insight:
        row.insightStatus === null
          ? null
          : {
              status: row.insightStatus as MemeInsightStatus,
              data: row.insightsJson ? (JSON.parse(row.insightsJson) as MemeInsightData) : null,
              errorMessage: row.errorMessage,
              extractedAt: row.extractedAt,
            },
    }));
}
