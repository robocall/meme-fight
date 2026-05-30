import { NextResponse } from "next/server";

import { getAllMemes } from "@/lib/db";
import { pickPair } from "@/lib/pair";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const pair = pickPair(await getAllMemes());

  if (!pair) {
    return NextResponse.json(
      { error: "Need at least two Box-backed memes. Run npm run ingest:reddit to import more." },
      { status: 400 },
    );
  }

  const [memeA, memeB] = pair;

  return NextResponse.json({ memeA, memeB });
}
