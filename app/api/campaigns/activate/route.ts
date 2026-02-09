import { NextRequest, NextResponse } from "next/server";
import {
  getActiveCampaignId,
  loadCampaignById,
  loadCharactersById,
  setActiveCampaignId
} from "@/lib/data";
import { getDirtyState, importState, resetStateForCampaign, updateCampaign } from "@/lib/state";
import { validateSession } from "@/lib/dm-session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionToken, campaignId, force, adminKey } = body as {
    sessionToken?: string;
    campaignId?: string;
    force?: boolean;
    adminKey?: string;
  };

  const expected = process.env.DM_KEY ?? "dm-secret";
  const allowed = adminKey === expected || validateSession(sessionToken);
  if (!allowed) {
    return NextResponse.json({ error: "invalid session" }, { status: 401 });
  }
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const { dirty, lastSavedAt } = getDirtyState();
  if (dirty && !force) {
    return NextResponse.json({ error: "unsaved changes", dirty, lastSavedAt }, { status: 409 });
  }

  const updatedIndex = setActiveCampaignId(campaignId);
  if (!updatedIndex) {
    return NextResponse.json({ error: "unknown campaignId" }, { status: 404 });
  }

  const campaign = loadCampaignById(campaignId);
  const characters = loadCharactersById(campaignId);
  if (!campaign || !characters) {
    return NextResponse.json({ error: "campaign data missing" }, { status: 500 });
  }

  const loaded = importState(campaignId);
  if (!loaded) {
    resetStateForCampaign(campaign, characters);
  }
  updateCampaign(campaign);

  return NextResponse.json({
    activeId: getActiveCampaignId(),
    dirty: false,
    lastSavedAt: loaded ? getDirtyState().lastSavedAt : undefined
  });
}
