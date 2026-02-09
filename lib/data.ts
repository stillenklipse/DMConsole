import fs from "fs";
import path from "path";
import { Campaign, Character, StatBlock, Weapon } from "@/types";

type CampaignIndex = {
  activeId: string;
  campaigns: Array<{ id: string; title: string; summary?: string }>;
};

const dataDir = path.join(process.cwd(), "data");
const campaignsDir = path.join(dataDir, "campaigns");
const indexPath = path.join(campaignsDir, "index.json");

const fallbackCharacters: Character[] = [
  {
    id: "demo",
    key: "demo",
    name: "Demo Adventurer",
    class: "Ranger",
    ancestry: "Human",
    traits: {
      strength: 0,
      agility: 1,
      finesse: 1,
      instinct: 0,
      knowledge: 0,
      presence: 0
    },
    defense: {
      evasion: 3,
      armor: 2,
      armorSlots: 2
    },
    damageThresholds: {
      minor: 5,
      major: 10,
      severe: 15
    },
    hope: 1,
    stats: {
      hp: 16,
      damage: 0,
      focus: 3,
      custom: { grit: 2 }
    },
    notes: "Fallback character seeded for POC if JSON has not been created yet."
  }
];

const fallbackCampaign: Campaign = {
  id: "oneshot",
  title: "One Shot Placeholder",
  summary: "Seed data from PDFs will replace this. Add maps, NPCs, and recap here.",
  npcs: [{ name: "Tavern Keeper", role: "Quest giver", note: "Knows the first hook." }],
  enemies: [{ name: "Bandit Scout", threat: "Low", note: "Prefers ambush." }],
  locations: [{ name: "Frontier Town", detail: "Dusty settlement on the edge of the wilds." }],
  referenceImages: [],
  recap: []
};

export function loadCharacters(): Character[] {
  try {
    const activeId = getActiveCampaignId();
    const charactersPath = getCharactersPath(activeId);
    if (fs.existsSync(charactersPath)) {
      const raw = fs.readFileSync(charactersPath, "utf-8");
      const parsed = JSON.parse(raw) as Character[];
      return parsed;
    }
  } catch (err) {
    console.warn("Failed to read characters.json, using fallback.", err);
  }
  return fallbackCharacters;
}

export function loadCampaign(): Campaign {
  try {
    const activeId = getActiveCampaignId();
    const campaignPath = getCampaignPath(activeId);
    if (fs.existsSync(campaignPath)) {
      const raw = fs.readFileSync(campaignPath, "utf-8");
      return JSON.parse(raw) as Campaign;
    }
  } catch (err) {
    console.warn("Failed to read campaign.json, using fallback.", err);
  }
  return fallbackCampaign;
}

export function loadCampaignIndex(): CampaignIndex | null {
  try {
    if (!fs.existsSync(indexPath)) return null;
    const raw = fs.readFileSync(indexPath, "utf-8");
    const parsed = JSON.parse(raw) as CampaignIndex;
    if (!parsed?.activeId || !Array.isArray(parsed.campaigns)) return null;
    return parsed;
  } catch (err) {
    console.warn("Failed to read campaigns index, using fallback.", err);
    return null;
  }
}

export function getActiveCampaignId(): string {
  const index = loadCampaignIndex();
  return index?.activeId ?? "oneshot";
}

export function setActiveCampaignId(nextId: string): CampaignIndex | null {
  const index = loadCampaignIndex();
  if (!index) return null;
  const exists = index.campaigns.some((c) => c.id === nextId);
  if (!exists) return null;
  const updated: CampaignIndex = { ...index, activeId: nextId };
  fs.writeFileSync(indexPath, JSON.stringify(updated, null, 2));
  return updated;
}

export function loadCampaignById(campaignId: string): Campaign | null {
  try {
    const campaignPath = getCampaignPath(campaignId);
    if (!fs.existsSync(campaignPath)) return null;
    const raw = fs.readFileSync(campaignPath, "utf-8");
    return JSON.parse(raw) as Campaign;
  } catch (err) {
    console.warn("Failed to read campaign.json for campaign.", err);
    return null;
  }
}

export function loadCharactersById(campaignId: string): Character[] | null {
  try {
    const charactersPath = getCharactersPath(campaignId);
    if (!fs.existsSync(charactersPath)) return null;
    const raw = fs.readFileSync(charactersPath, "utf-8");
    return JSON.parse(raw) as Character[];
  } catch (err) {
    console.warn("Failed to read characters.json for campaign.", err);
    return null;
  }
}

export function loadWeaponUpgrades(campaignId: string): Weapon[] {
  try {
    const upgradesPath = path.join(campaignsDir, campaignId, "weapon-upgrades.json");
    if (!fs.existsSync(upgradesPath)) return [];
    const raw = fs.readFileSync(upgradesPath, "utf-8");
    const parsed = JSON.parse(raw) as Weapon[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to read weapon-upgrades.json.", err);
    return [];
  }
}

function getCampaignPath(campaignId: string) {
  return path.join(campaignsDir, campaignId, "campaign.json");
}

function getCharactersPath(campaignId: string) {
  return path.join(campaignsDir, campaignId, "characters.json");
}

export function getCharacterByKey(key: string): Character | undefined {
  return loadCharacters().find((c) => c.key.toLowerCase() === key.toLowerCase());
}

export function mergeStats(base: StatBlock, incoming: Partial<StatBlock>): StatBlock {
  return {
    ...base,
    ...incoming,
    custom: { ...(base.custom ?? {}), ...(incoming.custom ?? {}) }
  };
}

