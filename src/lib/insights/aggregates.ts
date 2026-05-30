import { desc, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import type { MemeInsightData } from "@/lib/db/insights";
import { memeInsights, memes } from "@/lib/db/schema";

const DEFAULT_TIER_SIZE = 10;

type MemeWithReadyInsight = {
  id: string;
  title: string;
  elo: number;
  wins: number;
  losses: number;
  insight: MemeInsightData;
};

export type TierBreakdown = {
  value: string;
  label: string;
  count: number;
  share: number;
};

export type FormatStat = {
  format: string;
  label: string;
  count: number;
  avgElo: number;
  avgWinRate: number;
};

export type SubjectStat = {
  subject: string;
  count: number;
  avgElo: number;
};

export type InsightAggregates = {
  tierSize: number;
  totals: {
    memes: number;
    withReadyInsights: number;
    pending: number;
    failed: number;
  };
  humorStyle: {
    topTier: TierBreakdown[];
    bottomTier: TierBreakdown[];
    canCompare: boolean;
  };
  formats: FormatStat[];
  topSubjects: SubjectStat[];
  highlights: string[];
};

export async function getInsightAggregates(
  tierSize = DEFAULT_TIER_SIZE,
): Promise<InsightAggregates> {
  const totals = await getInsightTotals();
  const analyzed = await getMemesWithReadyInsights();

  if (analyzed.length === 0) {
    return {
      tierSize,
      totals,
      humorStyle: { topTier: [], bottomTier: [], canCompare: false },
      formats: [],
      topSubjects: [],
      highlights: [],
    };
  }

  const sorted = [...analyzed].sort((a, b) => b.elo - a.elo);
  const topTier = sorted.slice(0, Math.min(tierSize, sorted.length));
  const bottomStart = Math.max(topTier.length, sorted.length - tierSize);
  const bottomTier = sorted.slice(bottomStart);
  const canCompare = topTier.length > 0 && bottomTier.length > 0;

  const humorStyle = {
    topTier: breakdownByField(topTier, "humor_style"),
    bottomTier: breakdownByField(bottomTier, "humor_style"),
    canCompare,
  };

  const formats = computeFormatStats(analyzed);
  const topSubjects = computeTopSubjects(topTier);
  const highlights = buildHighlights(humorStyle, formats, topSubjects, canCompare);

  return {
    tierSize,
    totals,
    humorStyle,
    formats,
    topSubjects,
    highlights,
  };
}

async function getInsightTotals() {
  const memeRows = await getDb()
    .select({ id: memes.id })
    .from(memes)
    .where(isNotNull(memes.boxFileId))
    .all();
  const memeCount = memeRows.length;

  const insightRows = await getDb()
    .select({ status: memeInsights.status })
    .from(memeInsights)
    .all();

  let withReadyInsights = 0;
  let pending = 0;
  let failed = 0;

  for (const row of insightRows) {
    if (row.status === "ready") {
      withReadyInsights += 1;
    } else if (row.status === "pending") {
      pending += 1;
    } else if (row.status === "failed") {
      failed += 1;
    }
  }

  return {
    memes: memeCount,
    withReadyInsights,
    pending,
    failed,
  };
}

async function getMemesWithReadyInsights(): Promise<MemeWithReadyInsight[]> {
  const rows = await getDb()
    .select({
      id: memes.id,
      title: memes.title,
      elo: memes.elo,
      wins: memes.wins,
      losses: memes.losses,
      insightsJson: memeInsights.insightsJson,
    })
    .from(memes)
    .innerJoin(memeInsights, eq(memes.id, memeInsights.memeId))
    .where(isNotNull(memes.boxFileId))
    .orderBy(desc(memes.elo), desc(memes.wins))
    .all();

  return rows
    .filter((row) => row.insightsJson !== null)
    .map((row) => ({
      id: row.id,
      title: row.title,
      elo: row.elo,
      wins: row.wins,
      losses: row.losses,
      insight: JSON.parse(row.insightsJson!) as MemeInsightData,
    }));
}

function breakdownByField(
  memesWithInsights: MemeWithReadyInsight[],
  field: keyof MemeInsightData,
): TierBreakdown[] {
  const counts = new Map<string, number>();

  for (const meme of memesWithInsights) {
    const value = meme.insight[field]?.trim();
    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return [];
  }

  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      label: humanizeLabel(value),
      count,
      share: count / total,
    }))
    .sort((a, b) => b.count - a.count);
}

function computeFormatStats(analyzed: MemeWithReadyInsight[]): FormatStat[] {
  const groups = new Map<string, MemeWithReadyInsight[]>();

  for (const meme of analyzed) {
    const format = meme.insight.meme_format?.trim() || "unknown";
    const existing = groups.get(format) ?? [];
    existing.push(meme);
    groups.set(format, existing);
  }

  return [...groups.entries()]
    .map(([format, group]) => ({
      format,
      label: humanizeLabel(format),
      count: group.length,
      avgElo: average(group.map((meme) => meme.elo)),
      avgWinRate: average(group.map((meme) => winRate(meme))),
    }))
    .sort((a, b) => b.avgElo - a.avgElo);
}

function computeTopSubjects(topTier: MemeWithReadyInsight[]): SubjectStat[] {
  const subjectMemes = new Map<string, MemeWithReadyInsight[]>();

  for (const meme of topTier) {
    for (const subject of parseSubjects(meme.insight.subjects)) {
      const existing = subjectMemes.get(subject) ?? [];
      existing.push(meme);
      subjectMemes.set(subject, existing);
    }
  }

  return [...subjectMemes.entries()]
    .map(([subject, group]) => ({
      subject: titleCase(subject),
      count: group.length,
      avgElo: average(group.map((meme) => meme.elo)),
    }))
    .sort((a, b) => b.count - a.count || b.avgElo - a.avgElo)
    .slice(0, 10);
}

function buildHighlights(
  humorStyle: InsightAggregates["humorStyle"],
  formats: FormatStat[],
  topSubjects: SubjectStat[],
  canCompare: boolean,
): string[] {
  const highlights: string[] = [];

  if (canCompare && humorStyle.topTier.length > 0) {
    const topStyle = humorStyle.topTier[0];
    const bottomMatch = humorStyle.bottomTier.find((item) => item.value === topStyle.value);
    const topPct = Math.round(topStyle.share * 100);
    const bottomPct = Math.round((bottomMatch?.share ?? 0) * 100);

    highlights.push(
      `${topStyle.label} humor leads the top tier at ${topPct}%` +
        (bottomMatch
          ? `, compared with ${bottomPct}% in the bottom tier.`
          : " and does not appear in the bottom tier."),
    );
  } else if (humorStyle.topTier.length > 0) {
    const topStyle = humorStyle.topTier[0];
    highlights.push(
      `${topStyle.label} is the most common humor style among top-ranked memes (${Math.round(topStyle.share * 100)}%).`,
    );
  }

  if (formats.length >= 2) {
    const best = formats[0];
    const worst = formats[formats.length - 1];
    const eloGap = Math.round(best.avgElo - worst.avgElo);

    if (eloGap > 0) {
      highlights.push(
        `${best.label} memes average ${best.avgElo} ELO, ${eloGap} points above ${worst.label}.`,
      );
    }
  } else if (formats.length === 1) {
    highlights.push(`${formats[0].label} is the only analyzed format so far (${formats[0].count} memes).`);
  }

  if (topSubjects.length > 0) {
    const topSubject = topSubjects[0];
    highlights.push(
      `"${topSubject.subject}" appears in ${topSubject.count} of the top-tier memes.`,
    );
  }

  return highlights;
}

function parseSubjects(text: string | undefined): string[] {
  if (!text) {
    return [];
  }

  return text
    .split(/[,;]/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function humanizeLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function winRate(meme: MemeWithReadyInsight): number {
  const total = meme.wins + meme.losses;
  if (total === 0) {
    return 0;
  }

  return meme.wins / total;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
