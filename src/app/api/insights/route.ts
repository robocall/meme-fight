import { NextResponse } from "next/server";

import { getInsightAggregates } from "@/lib/insights/aggregates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TIER_SIZE = 10;
const MAX_TIER_SIZE = 25;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tierParam = searchParams.get("tier");
  const parsedTier = tierParam === null ? DEFAULT_TIER_SIZE : Number(tierParam);

  if (!Number.isFinite(parsedTier) || parsedTier < 1) {
    return NextResponse.json({ error: "tier must be a positive number." }, { status: 400 });
  }

  const tierSize = Math.min(Math.floor(parsedTier), MAX_TIER_SIZE);
  const aggregates = await getInsightAggregates(tierSize);

  return NextResponse.json(aggregates);
}
