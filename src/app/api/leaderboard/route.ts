import { desc, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { memes } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const leaderboard = await getDb()
    .select()
    .from(memes)
    .where(isNotNull(memes.boxFileId))
    .orderBy(desc(memes.elo), desc(memes.wins))
    .all();

  return NextResponse.json({ leaderboard });
}
