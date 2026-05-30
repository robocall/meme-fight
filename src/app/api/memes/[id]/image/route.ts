import { NextResponse } from "next/server";

import { isBoxConfigured } from "@/lib/box/config";
import { downloadMemeFile } from "@/lib/box/files";
import { getMemeById } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const meme = await getMemeById(id);

  if (!meme) {
    return NextResponse.json({ error: "Meme not found." }, { status: 404 });
  }

  if (!meme.boxFileId) {
    return NextResponse.json({ error: "Meme has no Box file." }, { status: 404 });
  }

  if (!isBoxConfigured()) {
    return NextResponse.json({ error: "Box is not configured." }, { status: 503 });
  }

  try {
    const { content, contentType } = await downloadMemeFile(meme.boxFileId);

    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": contentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load image from Box.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
