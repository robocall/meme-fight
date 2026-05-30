import type { AiExtractStructuredFieldsField } from "box-node-sdk/sdk-gen/schemas/aiExtractStructured";

import { getBoxClient } from "@/lib/box/client";
import { isBoxConfigured } from "@/lib/box/config";
import { withBoxRetries } from "@/lib/box/retry";
import type { MemeInsightData } from "@/lib/db/insights";

export const MEME_INSIGHT_FIELDS: AiExtractStructuredFieldsField[] = [
  {
    key: "overlay_text",
    displayName: "Overlay Text",
    description: "All text visible on the meme image, including top and bottom captions.",
    type: "string",
  },
  {
    key: "meme_format",
    displayName: "Meme Format",
    description: "The visual format or template of the meme.",
    type: "enum",
    options: [
      { key: "classic_top_bottom" },
      { key: "reaction" },
      { key: "screenshot" },
      { key: "deep_fried" },
      { key: "other" },
    ],
  },
  {
    key: "subjects",
    displayName: "Subjects",
    description: "People, brands, characters, or topics referenced in the meme.",
    type: "string",
  },
  {
    key: "humor_style",
    displayName: "Humor Style",
    description: "The primary style of humor used in the meme.",
    type: "enum",
    options: [
      { key: "absurdist" },
      { key: "relatable" },
      { key: "political" },
      { key: "meta" },
      { key: "dark" },
      { key: "wholesome" },
      { key: "other" },
    ],
  },
  {
    key: "summary",
    displayName: "Summary",
    description: "A one-sentence description of what the meme depicts or communicates.",
    type: "string",
  },
  {
    key: "why_funny",
    displayName: "Why Funny",
    description: "A brief explanation of why the meme might be funny or engaging.",
    type: "string",
  },
];

export async function extractMemeInsights(boxFileId: string): Promise<MemeInsightData> {
  if (!isBoxConfigured()) {
    throw new Error(
      "Box is not configured. Set CCG credentials or BOX_DEVELOPER_TOKEN in .env.local.",
    );
  }

  const client = getBoxClient();
  const response = await withBoxRetries(() =>
    client.ai.createAiExtractStructured({
      items: [{ type: "file", id: boxFileId }],
      fields: MEME_INSIGHT_FIELDS,
      includeConfidenceScore: true,
    }),
  );

  return normalizeInsightData(response.answer);
}

function normalizeInsightData(answer: Record<string, unknown>): MemeInsightData {
  return {
    overlay_text: stringField(answer.overlay_text),
    meme_format: stringField(answer.meme_format),
    subjects: stringField(answer.subjects),
    humor_style: stringField(answer.humor_style),
    summary: stringField(answer.summary),
    why_funny: stringField(answer.why_funny),
  };
}

function stringField(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}
