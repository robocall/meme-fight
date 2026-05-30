import { getDb } from "@/lib/db";
import { memes, votes } from "@/lib/db/schema";
import { updateElo } from "@/lib/elo";
import { loadLocalEnv } from "@/lib/ingest/load-env";
import { eq } from "drizzle-orm";

loadLocalEnv();

const DEFAULT_VOTE_COUNT = 500;
const ELO_MEAN = 1500;
const ELO_STD_DEV = 250;

type CliOptions = {
  voteCount: number;
  reset: boolean;
};

type MemeState = {
  id: string;
  title: string;
  elo: number;
  wins: number;
  losses: number;
  skill: number;
};

type VoteRecord = {
  id: string;
  winnerId: string;
  loserId: string;
  createdAt: Date;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    voteCount: DEFAULT_VOTE_COUNT,
    reset: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--reset") {
      options.reset = true;
      continue;
    }

    if (arg === "--votes" || arg === "-n") {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error("--votes must be a positive number.");
      }
      options.voteCount = Math.floor(value);
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  return options;
}

function printUsage(): void {
  console.log(`Usage: npm run db:seed-votes -- [options]

Options:
  --votes, -n <count>  Number of votes to generate (default: ${DEFAULT_VOTE_COUNT})
  --reset              Clear existing votes and reset meme ELO/wins/losses first
  --help, -h           Show this help message
`);
}

function randomNormal(mean: number, stdDev: number): number {
  let u = 0;
  let v = 0;

  while (u === 0) {
    u = Math.random();
  }
  while (v === 0) {
    v = Math.random();
  }

  const normal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + stdDev * normal;
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function pickRandomPair<T>(items: T[]): [T, T] {
  const firstIndex = Math.floor(Math.random() * items.length);
  let secondIndex = Math.floor(Math.random() * (items.length - 1));
  if (secondIndex >= firstIndex) {
    secondIndex += 1;
  }

  return [items[firstIndex]!, items[secondIndex]!];
}

function simulateVotes(memeStates: MemeState[], voteCount: number): VoteRecord[] {
  const voteRecords: VoteRecord[] = [];
  const byId = new Map(memeStates.map((meme) => [meme.id, meme]));

  for (let index = 0; index < voteCount; index += 1) {
    const [left, right] = pickRandomPair(memeStates);
    const leftWins = Math.random() < expectedScore(left.skill, right.skill);
    const winner = leftWins ? left : right;
    const loser = leftWins ? right : left;

    const { winnerElo, loserElo } = updateElo(winner.elo, loser.elo);
    winner.elo = winnerElo;
    winner.wins += 1;
    loser.elo = loserElo;
    loser.losses += 1;

    voteRecords.push({
      id: crypto.randomUUID(),
      winnerId: winner.id,
      loserId: loser.id,
      createdAt: new Date(Date.now() - (voteCount - index) * 1000),
    });

    byId.set(winner.id, winner);
    byId.set(loser.id, loser);
  }

  return voteRecords;
}

function summarizeEloDistribution(memeStates: MemeState[]): void {
  const elos = memeStates.map((meme) => meme.elo).sort((a, b) => a - b);
  const min = elos[0] ?? 0;
  const max = elos[elos.length - 1] ?? 0;
  const mean = Math.round(elos.reduce((sum, elo) => sum + elo, 0) / elos.length);
  const median = elos[Math.floor(elos.length / 2)] ?? 0;

  const bucketSize = 100;
  const buckets = new Map<number, number>();
  for (const elo of elos) {
    const bucket = Math.floor(elo / bucketSize) * bucketSize;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  console.log("\nELO distribution:");
  console.log(`  min: ${min}, max: ${max}, mean: ${mean}, median: ${median}`);

  const sortedBuckets = [...buckets.entries()].sort((a, b) => a[0] - b[0]);
  for (const [bucket, count] of sortedBuckets) {
    const bar = "#".repeat(Math.max(1, Math.round((count / elos.length) * 40)));
    console.log(`  ${String(bucket).padStart(4)}-${String(bucket + bucketSize - 1).padEnd(4)} | ${bar} (${count})`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const db = getDb();

  const memeRows = await db.select().from(memes).all();
  if (memeRows.length < 2) {
    throw new Error("Need at least 2 memes in the database to seed votes.");
  }

  if (options.reset) {
    await db.delete(votes);
    await db.update(memes).set({ elo: ELO_MEAN, wins: 0, losses: 0 });
    console.log("Reset existing votes and meme stats.");
  }

  const memeStates: MemeState[] = memeRows.map((meme) => ({
    id: meme.id,
    title: meme.title,
    elo: options.reset ? ELO_MEAN : meme.elo,
    wins: options.reset ? 0 : meme.wins,
    losses: options.reset ? 0 : meme.losses,
    skill: Math.round(randomNormal(ELO_MEAN, ELO_STD_DEV)),
  }));

  console.log(`Seeding ${options.voteCount} votes across ${memeStates.length} memes…`);
  console.log(`  Latent skill: mean=${ELO_MEAN}, stdDev=${ELO_STD_DEV}`);

  const voteRecords = simulateVotes(memeStates, options.voteCount);

  await db.insert(votes).values(voteRecords);

  for (const meme of memeStates) {
    await db
      .update(memes)
      .set({
        elo: meme.elo,
        wins: meme.wins,
        losses: meme.losses,
      })
      .where(eq(memes.id, meme.id));
  }

  console.log("\nSeed complete:");
  console.log(`  Votes inserted: ${voteRecords.length}`);
  console.log(`  Memes updated: ${memeStates.length}`);

  summarizeEloDistribution(memeStates);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
