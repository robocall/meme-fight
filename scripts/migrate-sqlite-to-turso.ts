import { createClient } from "@libsql/client";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { getTursoConfig } from "@/lib/db/config";
import { loadLocalEnv } from "@/lib/ingest/load-env";

loadLocalEnv();

const LOCAL_DB = path.join(process.cwd(), "data/meme_fight.db");

type LocalMeme = {
  id: string;
  title: string;
  image_url: string;
  box_file_id: string | null;
  source_post_id: string | null;
  elo: number;
  wins: number;
  losses: number;
  created_at: number;
};

type LocalVote = {
  id: string;
  winner_id: string;
  loser_id: string;
  created_at: number;
};

type LocalInsight = {
  meme_id: string;
  box_file_id: string;
  insights_json: string | null;
  error_message: string | null;
  status: string;
  extracted_at: number | null;
  created_at: number;
};

function queryLocal<T>(sql: string): T[] {
  const output = execSync(`sqlite3 -json ${JSON.stringify(LOCAL_DB)} ${JSON.stringify(sql)}`, {
    encoding: "utf8",
  }).trim();

  if (!output) {
    return [];
  }

  return JSON.parse(output) as T[];
}

async function getRemoteMemeCount(client: ReturnType<typeof createClient>): Promise<number> {
  const result = await client.execute("SELECT COUNT(*) AS count FROM memes");
  return Number(result.rows[0]?.count ?? 0);
}

async function importRows(
  client: ReturnType<typeof createClient>,
  statements: Array<{ sql: string; args: Array<string | number | null> }>,
) {
  const batchSize = 50;

  for (let index = 0; index < statements.length; index += batchSize) {
    await client.batch(statements.slice(index, index + batchSize), "write");
  }
}

async function main() {
  if (!existsSync(LOCAL_DB)) {
    throw new Error(`Local SQLite file not found at ${LOCAL_DB}`);
  }

  if (!process.env.TURSO_AUTH_TOKEN?.trim()) {
    throw new Error(
      "Missing TURSO_AUTH_TOKEN in .env.local. Create a token in the Turso dashboard for meme-fight.",
    );
  }

  execSync("npm run db:push", { stdio: "inherit" });

  const client = createClient(getTursoConfig());
  const remoteCount = await getRemoteMemeCount(client);

  if (remoteCount > 0) {
    console.log(`Turso already has ${remoteCount} meme(s). Skipping data import.`);
    return;
  }

  const memes = queryLocal<LocalMeme>("SELECT * FROM memes ORDER BY created_at");
  const votes = queryLocal<LocalVote>("SELECT * FROM votes ORDER BY created_at");
  const insights = queryLocal<LocalInsight>(
    "SELECT * FROM meme_insights ORDER BY created_at",
  );

  console.log(
    `Importing ${memes.length} meme(s), ${votes.length} vote(s), ${insights.length} insight(s)…`,
  );

  await importRows(
    client,
    memes.map((meme) => ({
      sql: `INSERT INTO memes (
        id, title, image_url, box_file_id, source_post_id, elo, wins, losses, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        meme.id,
        meme.title,
        meme.image_url,
        meme.box_file_id,
        meme.source_post_id,
        meme.elo,
        meme.wins,
        meme.losses,
        meme.created_at,
      ],
    })),
  );

  await importRows(
    client,
    votes.map((vote) => ({
      sql: "INSERT INTO votes (id, winner_id, loser_id, created_at) VALUES (?, ?, ?, ?)",
      args: [vote.id, vote.winner_id, vote.loser_id, vote.created_at],
    })),
  );

  await importRows(
    client,
    insights.map((insight) => ({
      sql: `INSERT INTO meme_insights (
        meme_id, box_file_id, insights_json, error_message, status, extracted_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        insight.meme_id,
        insight.box_file_id,
        insight.insights_json,
        insight.error_message,
        insight.status,
        insight.extracted_at,
        insight.created_at,
      ],
    })),
  );

  const importedCount = await getRemoteMemeCount(client);
  console.log(`Import complete. Turso now has ${importedCount} meme(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
