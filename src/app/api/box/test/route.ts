import { NextResponse } from "next/server";

import {
  getBoxAuthMode,
  getMemesFolderId,
  getMissingCcgEnvVars,
  isBoxConfigured,
} from "@/lib/box/config";
import { getBoxClient } from "@/lib/box/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isBoxConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Box environment variables are not configured.",
        missingCcg: getMissingCcgEnvVars(),
        hint: "Set BOX_DEVELOPER_TOKEN for local dev, or full CCG credentials for production.",
      },
      { status: 503 },
    );
  }

  try {
    const client = getBoxClient();
    const me = await client.users.getUserMe();

    return NextResponse.json({
      ok: true,
      authMode: getBoxAuthMode(),
      serviceAccount: {
        id: me.id,
        name: me.name,
        login: me.login,
      },
      memesFolderId: getMemesFolderId(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Box error.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
