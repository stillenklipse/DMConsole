import { NextRequest, NextResponse } from "next/server";
import { loadCampaignById } from "@/lib/data";
import { getCampaignLastSavedAt } from "@/lib/state";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }
  const campaign = loadCampaignById(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "campaign not found" }, { status: 404 });
  }
  const lastSavedAt = getCampaignLastSavedAt(campaignId) ?? null;
  return NextResponse.json({
    campaign: { id: campaign.id, title: campaign.title, summary: campaign.summary ?? "" },
    lastSavedAt
  });
}
