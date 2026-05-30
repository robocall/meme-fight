import { extractMemeInsights } from "@/lib/box/insights";
import {
  markInsightPending,
  saveInsightFailed,
  saveInsightReady,
  type MemeInsightData,
} from "@/lib/db/insights";

export async function processMemeInsightExtraction(
  memeId: string,
  boxFileId: string,
): Promise<MemeInsightData> {
  await markInsightPending(memeId, boxFileId);

  try {
    const data = await extractMemeInsights(boxFileId);
    await saveInsightReady(memeId, data);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown extraction error.";
    await saveInsightFailed(memeId, message);
    throw error;
  }
}
