import { ApifyClient } from "apify-client";

import { isBoxConfigured } from "@/lib/box/config";
import { uploadMemeFile } from "@/lib/box/files";
import { getMemeBySourcePostId, getDb } from "@/lib/db/index";
import { memes } from "@/lib/db/schema";

import { getRedditIngestConfig, REDDIT_MEDIA_ACTOR_ID, type RedditIngestConfig } from "./config";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TITLE_LENGTH = 200;

export type RedditMediaItem = {
  subreddit: string;
  title: string;
  mediaUrl: string;
  mediaType: string;
  author: string;
  score: number;
  permalink: string;
};

type MacrocosmosRedditPost = {
  url?: string;
  id?: string;
  title?: string;
  username?: string;
  communityName?: string;
  dataType?: string;
  score?: number;
  isNsfw?: boolean;
  media?: unknown;
  error?: string;
};

export type IngestRedditResult = {
  scraped: number;
  skippedActorError: number;
  skippedNotImage: number;
  skippedLowScore: number;
  skippedDuplicate: number;
  skippedNoPostId: number;
  failed: number;
  imported: number;
  errors: string[];
};

export async function ingestRedditMemes(
  configOverride?: Partial<RedditIngestConfig>,
): Promise<IngestRedditResult> {
  if (!isBoxConfigured()) {
    throw new Error(
      "Box is not configured. Set Box credentials in .env.local before ingesting memes.",
    );
  }

  const config = { ...getRedditIngestConfig(), ...configOverride };
  const result = emptyResult();

  const { items, actorErrors } = await fetchRedditMediaItems(config);
  result.scraped = items.length;
  result.skippedActorError = actorErrors;

  if (items.length === 0 && actorErrors > 0) {
    throw new Error(
      `Apify returned ${actorErrors} error row(s) and no usable posts. Reddit may be blocking the scraper or the subreddits may be empty.`,
    );
  }

  for (const item of items) {
    try {
      const outcome = await processMediaItem(item, config);
      switch (outcome) {
        case "imported":
          result.imported += 1;
          break;
        case "skipped_not_image":
          result.skippedNotImage += 1;
          break;
        case "skipped_low_score":
          result.skippedLowScore += 1;
          break;
        case "skipped_duplicate":
          result.skippedDuplicate += 1;
          break;
        case "skipped_no_post_id":
          result.skippedNoPostId += 1;
          break;
      }
    } catch (error) {
      result.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      const label = item.title || item.permalink || item.mediaUrl || "unknown item";
      result.errors.push(`${label}: ${message}`);
    }
  }

  return result;
}

async function fetchRedditMediaItems(config: RedditIngestConfig): Promise<{
  items: RedditMediaItem[];
  actorErrors: number;
}> {
  const client = new ApifyClient({ token: config.apifyToken });

  const run = await client.actor(REDDIT_MEDIA_ACTOR_ID).call({
    subreddits: config.subreddits,
    sort: config.sort,
    limit: config.maxItems,
  });

  const datasetId = run.defaultDatasetId;
  if (!datasetId) {
    throw new Error("Apify run finished without a default dataset.");
  }

  const { items: rawItems } = await client.dataset(datasetId).listItems();
  const items: RedditMediaItem[] = [];
  let actorErrors = 0;

  for (const raw of rawItems) {
    const post = raw as MacrocosmosRedditPost;
    if (post.error) {
      actorErrors += 1;
      continue;
    }

    const normalized = normalizeMacrocosmosPost(post);
    if (normalized) {
      items.push(normalized);
    }
  }

  return { items, actorErrors };
}

function normalizeMacrocosmosPost(post: MacrocosmosRedditPost): RedditMediaItem | null {
  if (post.dataType !== "post") {
    return null;
  }

  if (post.isNsfw) {
    return null;
  }

  const mediaUrl = pickImageUrl(post.media);
  if (!mediaUrl) {
    return null;
  }

  const permalink = post.url?.trim();
  const title = post.title?.trim();
  if (!permalink || !title) {
    return null;
  }

  return {
    subreddit: (post.communityName ?? "").replace(/^r\//i, ""),
    title,
    mediaUrl,
    mediaType: "image",
    author: post.username ?? "",
    score: post.score ?? 0,
    permalink,
  };
}

function pickImageUrl(media: unknown): string | null {
  if (!Array.isArray(media)) {
    return null;
  }

  for (const entry of media) {
    if (typeof entry !== "string") {
      continue;
    }

    const url = entry.startsWith("//") ? `https:${entry}` : entry;
    if (isDirectImageUrl(url)) {
      return url;
    }
  }

  return null;
}

function isDirectImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "v.redd.it") {
      return false;
    }

    if (parsed.hostname === "i.redd.it") {
      return true;
    }

    return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

type ProcessOutcome =
  | "imported"
  | "skipped_not_image"
  | "skipped_low_score"
  | "skipped_duplicate"
  | "skipped_no_post_id";

async function processMediaItem(
  item: RedditMediaItem,
  config: RedditIngestConfig,
): Promise<ProcessOutcome> {
  if (!isImageMediaType(item.mediaType)) {
    return "skipped_not_image";
  }

  if (item.score < config.minScore) {
    return "skipped_low_score";
  }

  const sourcePostId = parseRedditPostId(item.permalink);
  if (!sourcePostId) {
    return "skipped_no_post_id";
  }

  if (await getMemeBySourcePostId(sourcePostId)) {
    return "skipped_duplicate";
  }

  const { buffer, contentType } = await downloadImage(item.mediaUrl);
  const extension = extensionFromContentType(contentType);
  const fileName = `reddit-${sourcePostId}.${extension}`;
  const uploaded = await uploadMemeFile(fileName, buffer, contentType);

  await getDb().insert(memes).values({
    id: crypto.randomUUID(),
    title: normalizeTitle(item.title),
    imageUrl: uploaded.sharedLinkUrl,
    boxFileId: uploaded.boxFileId,
    sourcePostId,
    elo: 1500,
    wins: 0,
    losses: 0,
    createdAt: new Date(),
  });

  return "imported";
}

function isImageMediaType(mediaType: string | null | undefined): boolean {
  if (!mediaType) {
    return false;
  }

  const normalized = mediaType.toLowerCase();
  return normalized === "image" || normalized.startsWith("image ");
}

export function parseRedditPostId(permalink: string): string | null {
  const match = permalink.match(/\/comments\/([a-z0-9]+)\//i);
  return match?.[1] ?? null;
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= MAX_TITLE_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_TITLE_LENGTH - 1)}…`;
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await downloadImageOnce(url);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 3) {
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError ?? new Error(`Image download failed: ${url}`);
}

async function downloadImageOnce(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MemeFightIngest/1.0",
      Accept: "image/*",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Image download failed (${response.status}): ${url}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Unexpected content type "${contentType || "unknown"}" for ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error(`Empty image response for ${url}`);
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds ${MAX_IMAGE_BYTES} byte limit (${buffer.length} bytes).`);
  }

  return { buffer, contentType };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extensionFromContentType(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function emptyResult(): IngestRedditResult {
  return {
    scraped: 0,
    skippedActorError: 0,
    skippedNotImage: 0,
    skippedLowScore: 0,
    skippedDuplicate: 0,
    skippedNoPostId: 0,
    failed: 0,
    imported: 0,
    errors: [],
  };
}
