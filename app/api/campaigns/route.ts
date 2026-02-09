import { NextResponse } from "next/server";
import { getActiveCampaignId, loadCampaignIndex } from "@/lib/data";

export async function GET() {
  const index = loadCampaignIndex();
  return NextResponse.json({
    activeId: getActiveCampaignId(),
    campaigns: index?.campaigns ?? []
  });
}
