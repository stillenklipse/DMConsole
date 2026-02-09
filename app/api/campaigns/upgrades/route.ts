import { NextRequest, NextResponse } from "next/server";
import { getActiveCampaignId, loadWeaponUpgrades } from "@/lib/data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId") ?? getActiveCampaignId();
  const upgrades = loadWeaponUpgrades(campaignId);
  return NextResponse.json({ campaignId, upgrades });
}
