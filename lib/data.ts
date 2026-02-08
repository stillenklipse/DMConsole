import fs from "fs";
import path from "path";
import { Campaign, Character, StatBlock } from "@/types";

const dataDir = path.join(process.cwd(), "data");
const charactersPath = path.join(dataDir, "characters.json");
const campaignPath = path.join(dataDir, "campaign.json");

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
    if (fs.existsSync(campaignPath)) {
      const raw = fs.readFileSync(campaignPath, "utf-8");
      return JSON.parse(raw) as Campaign;
    }
  } catch (err) {
    console.warn("Failed to read campaign.json, using fallback.", err);
  }
  return fallbackCampaign;
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

