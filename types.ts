export type StatBlock = {
  hp: number;
  damage: number;
  focus?: number;
  hope?: number;
  stress?: number;
  custom?: Record<string, number>;
  notes?: string;
};

export type Weapon = {
  id?: string;
  name: string;
  trait?: string;
  damage?: string;
  notes?: string;
};

export type Character = {
  id: string;
  key: string;
  name: string;
  ancestry?: string;
  class?: string;
  level?: number;
  pdf?: string;
  traits?: {
    strength?: number;
    agility?: number;
    finesse?: number;
    instinct?: number;
    knowledge?: number;
    presence?: number;
  };
  defense?: {
    evasion?: number;
    armor?: number;
    armorSlots?: number;
  };
  damageThresholds?: {
    minor?: number;
    major?: number;
    severe?: number;
  };
  hope?: number;
  experienceNeeded?: number;
  weapon?: Weapon;
  secondaryWeapon?: Weapon;
  tertiaryWeapon?: Weapon;
  armor?: {
    name: string;
    thresholds?: string;
    score?: number;
    notes?: string;
  };
  experiences?: { name: string; modifier: number }[];
  stats: StatBlock;
  tags?: string[];
  notes?: string;
};

export type Campaign = {
  id: string;
  title: string;
  summary?: string;
  theme?: {
    backgroundImage?: string;
    backgroundColor?: string;
  };
  npcs?: { name: string; role?: string; note?: string }[];
  enemies?: { name: string; threat?: string; note?: string; hp?: number; attack?: string }[];
  locations?: { name: string; detail?: string }[];
  referenceImages?: { title: string; url: string; share?: boolean }[];
  dmNotes?: { note: string; share?: boolean }[];
  recap?: string[]; // legacy
  gmNotes?: string; // legacy
  plotDetails?: string[];
};

export type GameEventType = "stat-update" | "roll" | "note";

export type GameEvent = {
  id: string;
  type: GameEventType;
  playerKey?: string;
  characterId?: string;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  resolvedAt?: number;
  resolutionNote?: string;
};

export type GameState = {
  stats: Record<string, StatBlock>;
  events: GameEvent[];
  referenceNotes: { id: string; author: string; text: string; createdAt: number; shared?: boolean }[];
  sharedReferenceImages?: { title: string; url: string }[];
  fear?: number;
  playerNotes?: Record<string, string>;
  weaponOverrides?: Record<string, { primary?: Weapon | null; secondary?: Weapon | null; tertiary?: Weapon | null }>;
  xpStatus?: Record<string, { currentExperience: number; currentLevel: number }>;
};

