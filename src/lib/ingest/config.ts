export const REDDIT_MEDIA_ACTOR_ID = "macrocosmos/reddit-scraper";

export type RedditIngestConfig = {
  apifyToken: string;
  subreddits: string[];
  sort: "hot" | "new" | "top";
  maxItems: number;
  minScore: number;
};

const DEFAULT_SUBREDDITS = ["memes", "dankmemes", "me_irl"];

export function getRedditIngestConfig(): RedditIngestConfig {
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    throw new Error("Missing APIFY_TOKEN. Add it to .env.local.");
  }

  const subreddits = parseSubreddits(process.env.REDDIT_INGEST_SUBREDDITS);
  const sort = parseSort(process.env.REDDIT_INGEST_SORT);
  const maxItems = parsePositiveInt(process.env.REDDIT_INGEST_MAX_ITEMS, 50, 100);
  const minScore = parseNonNegativeInt(process.env.REDDIT_INGEST_MIN_SCORE, 0);

  return {
    apifyToken,
    subreddits,
    sort,
    maxItems,
    minScore,
  };
}

function parseSubreddits(value: string | undefined): string[] {
  if (!value?.trim()) {
    return DEFAULT_SUBREDDITS;
  }

  const subreddits = value
    .split(",")
    .map((name) => name.trim().replace(/^r\//i, ""))
    .filter(Boolean);

  if (subreddits.length === 0) {
    throw new Error("REDDIT_INGEST_SUBREDDITS must include at least one subreddit name.");
  }

  return subreddits;
}

function parseSort(value: string | undefined): RedditIngestConfig["sort"] {
  if (!value) {
    return "hot";
  }

  if (value === "hot" || value === "new" || value === "top") {
    return value;
  }

  throw new Error(`Invalid REDDIT_INGEST_SORT "${value}". Use hot, new, or top.`);
}

function parsePositiveInt(
  value: string | undefined,
  defaultValue: number,
  max: number,
): number {
  if (!value?.trim()) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Expected a positive integer, got "${value}".`);
  }

  return Math.min(parsed, max);
}

function parseNonNegativeInt(value: string | undefined, defaultValue: number): number {
  if (!value?.trim()) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative integer, got "${value}".`);
  }

  return parsed;
}
