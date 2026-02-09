import { NextRequest, NextResponse } from "next/server";
import { getActiveCampaignId } from "@/lib/data";
import { exportState, getDirtyState } from "@/lib/state";
import { validateSession } from "@/lib/dm-session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionToken, adminKey } = body as { sessionToken?: string; adminKey?: string };
  const expected = process.env.DM_KEY ?? "dm-secret";
  const allowed = adminKey === expected || validateSession(sessionToken);
  if (!allowed) {
    return NextResponse.json({ error: "invalid session" }, { status: 401 });
  }
  const activeId = getActiveCampaignId();
  const result = exportState(activeId);
  return NextResponse.json({ activeId, ...getDirtyState(), lastSavedAt: result.lastSavedAt });
}
