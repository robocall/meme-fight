import { loadLocalEnv } from "@/lib/ingest/load-env";
import { getRedditIngestConfig, REDDIT_MEDIA_ACTOR_ID } from "@/lib/ingest/config";
import { ingestRedditMemes } from "@/lib/ingest/reddit";

loadLocalEnv();

async function main() {
  const config = getRedditIngestConfig();

  console.log("Starting Reddit ingest…");
  console.log(`  Actor: ${REDDIT_MEDIA_ACTOR_ID}`);
  console.log(`  Subreddits: ${config.subreddits.join(", ")}`);
  console.log(`  Sort: ${config.sort}`);
  console.log(`  Max items per subreddit: ${config.maxItems}`);
  console.log(`  Min score: ${config.minScore}`);

  const result = await ingestRedditMemes();

  console.log("\nIngest complete:");
  console.log(`  Scraped from Apify: ${result.scraped}`);
  console.log(`  Skipped (actor errors): ${result.skippedActorError}`);
  console.log(`  Imported: ${result.imported}`);
  console.log(`  Skipped (not image): ${result.skippedNotImage}`);
  console.log(`  Skipped (low score): ${result.skippedLowScore}`);
  console.log(`  Skipped (duplicate): ${result.skippedDuplicate}`);
  console.log(`  Skipped (no post id): ${result.skippedNoPostId}`);
  console.log(`  Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  if (result.imported === 0 && (result.failed > 0 || result.scraped === 0)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
