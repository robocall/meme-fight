import { createClient } from "@libsql/client";

import { getTursoConfig } from "@/lib/db/config";
import { loadLocalEnv } from "@/lib/ingest/load-env";

loadLocalEnv();

async function main() {
  const client = createClient(getTursoConfig());

  await client.batch(
    [
      { sql: "DELETE FROM votes", args: [] },
      { sql: "DELETE FROM meme_insights", args: [] },
      { sql: "DELETE FROM memes", args: [] },
    ],
    "write",
  );

  const counts = await client.batch(
    [
      { sql: "SELECT COUNT(*) AS count FROM memes", args: [] },
      { sql: "SELECT COUNT(*) AS count FROM votes", args: [] },
      { sql: "SELECT COUNT(*) AS count FROM meme_insights", args: [] },
    ],
    "read",
  );

  console.log("Turso cleared:");
  console.log(`  memes: ${counts[0].rows[0]?.count ?? 0}`);
  console.log(`  votes: ${counts[1].rows[0]?.count ?? 0}`);
  console.log(`  insights: ${counts[2].rows[0]?.count ?? 0}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
