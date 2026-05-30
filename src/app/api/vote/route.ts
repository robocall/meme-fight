import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb, getMemeById } from "@/lib/db";
import { memes, votes } from "@/lib/db/schema";
import { updateElo } from "@/lib/elo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VoteBody = {
  winnerId?: string;
  loserId?: string;
};

export async function POST(request: Request) {
  let body: VoteBody;

  try {
    body = (await request.json()) as VoteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { winnerId, loserId } = body;

  if (!winnerId || !loserId) {
    return NextResponse.json(
      { error: "winnerId and loserId are required." },
      { status: 400 },
    );
  }

  if (winnerId === loserId) {
    return NextResponse.json(
      { error: "Winner and loser must be different memes." },
      { status: 400 },
    );
  }

  const winner = getMemeById(winnerId);
  const loser = getMemeById(loserId);

  if (!winner || !loser) {
    return NextResponse.json({ error: "One or both memes not found." }, { status: 404 });
  }

  const { winnerElo, loserElo } = updateElo(winner.elo, loser.elo);
  const db = getDb();

  db.insert(votes)
    .values({
      id: crypto.randomUUID(),
      winnerId,
      loserId,
      createdAt: new Date(),
    })
    .run();

  db.update(memes)
    .set({
      elo: winnerElo,
      wins: winner.wins + 1,
    })
    .where(eq(memes.id, winnerId))
    .run();

  db.update(memes)
    .set({
      elo: loserElo,
      losses: loser.losses + 1,
    })
    .where(eq(memes.id, loserId))
    .run();

  return NextResponse.json({
    winner: { ...winner, elo: winnerElo, wins: winner.wins + 1 },
    loser: { ...loser, elo: loserElo, losses: loser.losses + 1 },
  });
}
