import { loadLocalEnv } from "@/lib/ingest/load-env";
import { getMemeById } from "@/lib/db";
import { getInsightByMemeId, getTopMemesForInsights } from "@/lib/db/insights";
import { processMemeInsightExtraction } from "@/lib/insights/extract";
import { isBoxConfigured } from "@/lib/box/config";
import { createProgressReporter } from "@/lib/utils/progress";
import { runWithConcurrency } from "@/lib/utils/run-with-concurrency";

loadLocalEnv();

const DEFAULT_CONCURRENCY = 5;
const MAX_CONCURRENCY = 10;

type ExtractionTarget = {
  id: string;
  title: string;
  boxFileId: string;
};

type CliOptions = {
  top: number | null;
  memeId: string | null;
  all: boolean;
  force: boolean;
  concurrency: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    top: 10,
    memeId: null,
    all: false,
    force: false,
    concurrency: DEFAULT_CONCURRENCY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--all") {
      options.all = true;
      options.top = null;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--meme-id") {
      options.memeId = argv[index + 1] ?? null;
      options.top = null;
      index += 1;
      continue;
    }

    if (arg === "--top") {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error("--top must be a positive number.");
      }
      options.top = value;
      index += 1;
      continue;
    }

    if (arg === "--concurrency") {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error("--concurrency must be a positive number.");
      }
      options.concurrency = Math.min(Math.floor(value), MAX_CONCURRENCY);
      index += 1;
      continue;
    }
  }

  return options;
}

async function main() {
  if (!isBoxConfigured()) {
    throw new Error(
      "Box is not configured. Set CCG credentials or BOX_DEVELOPER_TOKEN in .env.local.",
    );
  }

  const options = parseArgs(process.argv.slice(2));
  const targets = await resolveTargets(options);

  if (targets.length === 0) {
    console.log("No memes to process.");
    return;
  }

  const { jobs, skipped } = await filterTargets(targets, options.force);

  console.log(
    `Extracting insights for ${jobs.length} meme(s) with concurrency ${options.concurrency}…`,
  );
  if (skipped > 0) {
    console.log(`  Skipping ${skipped} meme(s) already marked ready.`);
  }

  if (jobs.length === 0) {
    console.log("\nExtraction complete:");
    console.log("  Succeeded: 0");
    console.log("  Failed: 0");
    console.log(`  Skipped: ${skipped}`);
    return;
  }

  let succeeded = 0;
  let failed = 0;
  const progress = createProgressReporter(jobs.length);

  console.log(`  [0/${jobs.length} · 0% · ETA calculating…] starting…`);

  await runWithConcurrency(jobs, options.concurrency, async (target) => {
    console.log(`  extract ${target.title}`);

    try {
      const data = await processMemeInsightExtraction(target.id, target.boxFileId);
      const snapshot = progress.markComplete();
      console.log(`    ${snapshot.label} ok: ${target.title} — ${data.summary ?? "(no summary)"}`);
      succeeded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      const snapshot = progress.markComplete();
      console.log(`    ${snapshot.label} failed: ${target.title} — ${message}`);
      failed += 1;
    }
  });

  console.log(`  [${jobs.length}/${jobs.length} · 100% · finished in ${progress.elapsedLabel()}]`);

  console.log("\nExtraction complete:");
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Skipped: ${skipped}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function filterTargets(
  targets: ExtractionTarget[],
  force: boolean,
): Promise<{ jobs: ExtractionTarget[]; skipped: number }> {
  if (force) {
    return { jobs: targets, skipped: 0 };
  }

  const jobs: ExtractionTarget[] = [];
  let skipped = 0;

  for (const target of targets) {
    const existing = await getInsightByMemeId(target.id);
    if (existing?.status === "ready") {
      skipped += 1;
      continue;
    }

    jobs.push(target);
  }

  return { jobs, skipped };
}

async function resolveTargets(options: CliOptions): Promise<ExtractionTarget[]> {
  if (options.memeId) {
    const meme = await getMemeById(options.memeId);
    if (!meme?.boxFileId) {
      throw new Error(`Meme not found or missing box_file_id: ${options.memeId}`);
    }

    return [{ id: meme.id, title: meme.title, boxFileId: meme.boxFileId }];
  }

  if (options.all) {
    return (await getTopMemesForInsights(Number.MAX_SAFE_INTEGER, !options.force)).map((row) => ({
      id: row.id,
      title: row.title,
      boxFileId: row.boxFileId!,
    }));
  }

  const limit = options.top ?? 10;
  return (await getTopMemesForInsights(limit, !options.force)).map((row) => ({
    id: row.id,
    title: row.title,
    boxFileId: row.boxFileId!,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
