import { getActiveCampaignId, loadCampaign, loadCharacters, mergeStats } from "@/lib/data";
import { Campaign, Character, GameEvent, GameState, StatBlock, Weapon } from "@/types";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

type MutableState = GameState & {
  campaign?: Campaign;
  dirty?: boolean;
  lastSavedAt?: number;
};

const globalState = globalThis as unknown as { __GAME_STATE?: MutableState };

function bootstrapState(): MutableState {
  if (!globalState.__GAME_STATE) {
    const characters = loadCharacters();
    const campaign = loadCampaign();
    const stats: Record<string, StatBlock> = {};
    characters.forEach((c) => {
      stats[c.id] = c.stats;
    });
    const xpStatus = buildInitialXpStatus(characters);

    const activeId = getActiveCampaignId();
    const loaded = readStateFile(activeId);
    const referenceNotes = loaded?.state.referenceNotes ?? seedReferenceNotes(campaign);
    const sharedReferenceImages = loaded?.state.sharedReferenceImages ?? seedSharedImages(campaign);

    globalState.__GAME_STATE = {
      stats: loaded?.state.stats ?? stats,
      events: loaded?.state.events ?? [],
      referenceNotes,
      sharedReferenceImages,
      campaign,
      fear: loaded?.state.fear ?? 0,
      playerNotes: loaded?.state.playerNotes ?? {},
      weaponOverrides: loaded?.state.weaponOverrides ?? {},
      xpStatus: loaded?.state.xpStatus ?? xpStatus,
      dirty: false,
      lastSavedAt: loaded?.lastSavedAt
    };
  }
  return globalState.__GAME_STATE!;
}

export function getState(): MutableState {
  return bootstrapState();
}

export function recordStatUpdate(playerKey: string, characterId: string, stats: Partial<StatBlock>) {
  const state = bootstrapState();
  const event: GameEvent = {
    id: randomUUID(),
    type: "stat-update",
    playerKey,
    characterId,
    payload: { stats },
    status: "pending",
    createdAt: Date.now()
  };
  state.events.unshift(event);
  markDirty();
  return event;
}

export function recordRoll(payload: {
  playerKey: string;
  characterId: string;
  die: string;
  result: number;
  modifiers?: { label: string; value: number }[];
  total: number;
  note?: string;
  payload?: Record<string, unknown>;
}) {
  const state = bootstrapState();
  const event: GameEvent = {
    id: randomUUID(),
    type: "roll",
    playerKey: payload.playerKey,
    characterId: payload.characterId,
    payload,
    status: "pending",
    createdAt: Date.now()
  };
  state.events.unshift(event);
  markDirty();
  return event;
}

export function recordNote(author: string, text: string, shared = false) {
  const state = bootstrapState();
  const note = { id: randomUUID(), author: author || "Dungeon Master", text, createdAt: Date.now(), shared };
  state.referenceNotes.unshift(note);
  markDirty();
  return note;
}

export function setNoteShare(noteId: string, shared: boolean) {
  const state = bootstrapState();
  const note = state.referenceNotes.find((n) => n.id === noteId);
  if (!note) return undefined;
  note.shared = shared;
  markDirty();
  return note;
}

export function approveEvent(eventId: string, status: "approved" | "rejected", resolutionNote?: string) {
  const state = bootstrapState();
  const idx = state.events.findIndex((e) => e.id === eventId);
  if (idx === -1) return undefined;
  const event = state.events[idx];
  event.status = status;
  event.resolvedAt = Date.now();
  event.resolutionNote = resolutionNote;
  markDirty();

  if (status === "approved" && event.type === "stat-update") {
    const { characterId, payload } = event;
    if (characterId && payload?.stats) {
      const existing = state.stats[characterId];
      state.stats[characterId] = mergeStats(existing, payload.stats as Partial<StatBlock>);
    }
  }

  return event;
}

export function getEvents(filter?: { playerKey?: string; status?: "pending" | "approved" | "rejected" }) {
  const state = bootstrapState();
  return state.events.filter((e) => {
    if (filter?.playerKey && e.playerKey !== filter.playerKey) return false;
    if (filter?.status && e.status !== filter.status) return false;
    return true;
  });
}

export function getStats() {
  return bootstrapState().stats;
}

export function syncStats(characterId: string, stats: Partial<StatBlock>) {
  const state = bootstrapState();
  if (!state.stats[characterId]) return undefined;
  const base = state.stats[characterId];
  const incoming: Partial<StatBlock> = { ...stats };

  // Never allow client live-sync to change max HP
  delete (incoming as any).hp;

  // Clamp currentHp (stored in custom) to max HP
  const incomingCurrentHp = (incoming as any)?.custom?.currentHp;
  if (typeof incomingCurrentHp === "number") {
    const clamped = Math.max(0, Math.min(base.hp, incomingCurrentHp));
    incoming.custom = { ...(incoming.custom ?? {}), currentHp: clamped };
  }

  state.stats[characterId] = mergeStats(base, incoming);
  markDirty();
  return state.stats[characterId];
}

export function applyStatUpdate(characterId: string, stats: Partial<StatBlock>) {
  const state = bootstrapState();
  if (!state.stats[characterId]) return undefined;
  state.stats[characterId] = mergeStats(state.stats[characterId], stats);
  markDirty();
  return state.stats[characterId];
}

export function setFear(value: number) {
  const state = bootstrapState();
  const clamped = Math.max(0, Math.min(12, value));
  state.fear = clamped;
  markDirty();
  return state.fear;
}

export function updateCampaign(campaign: Campaign) {
  const state = bootstrapState();
  state.campaign = campaign;
}

export function getCampaignFromState() {
  return bootstrapState().campaign;
}

export function setSharedReferenceImages(images: { title: string; url: string }[]) {
  const state = bootstrapState();
  state.sharedReferenceImages = images;
  markDirty();
  return state.sharedReferenceImages;
}

export function getDirtyState() {
  return { dirty: Boolean(bootstrapState().dirty), lastSavedAt: bootstrapState().lastSavedAt };
}

export function getCampaignLastSavedAt(campaignId: string) {
  const loaded = readStateFile(campaignId);
  return loaded?.lastSavedAt;
}

export function exportState(campaignId?: string) {
  const state = bootstrapState();
  const id = campaignId ?? getActiveCampaignId();
  const statePath = getStatePath(id);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const serialized: GameState = {
    stats: state.stats,
    events: state.events,
    referenceNotes: state.referenceNotes,
    sharedReferenceImages: state.sharedReferenceImages ?? [],
    fear: state.fear ?? 0,
    playerNotes: state.playerNotes ?? {},
    weaponOverrides: state.weaponOverrides ?? {},
    xpStatus: state.xpStatus ?? {}
  };
  fs.writeFileSync(statePath, JSON.stringify(serialized, null, 2));
  state.dirty = false;
  state.lastSavedAt = Date.now();
  return { statePath, lastSavedAt: state.lastSavedAt };
}

export function importState(campaignId?: string) {
  const state = bootstrapState();
  const id = campaignId ?? getActiveCampaignId();
  const loaded = readStateFile(id);
  if (!loaded) return false;
  state.stats = loaded.state.stats ?? {};
  state.events = loaded.state.events ?? [];
  state.referenceNotes = loaded.state.referenceNotes ?? [];
  state.sharedReferenceImages = loaded.state.sharedReferenceImages ?? [];
  state.fear = loaded.state.fear ?? 0;
  state.playerNotes = loaded.state.playerNotes ?? {};
  state.weaponOverrides = loaded.state.weaponOverrides ?? {};
  state.xpStatus = loaded.state.xpStatus ?? buildInitialXpStatus(loadCharacters());
  state.dirty = false;
  state.lastSavedAt = loaded.lastSavedAt;
  return true;
}

export function resetStateForCampaign(campaign: Campaign, characters: Character[]) {
  const state = bootstrapState();
  const stats: Record<string, StatBlock> = {};
  characters.forEach((c) => {
    stats[c.id] = c.stats;
  });
  state.stats = stats;
  state.events = [];
  state.referenceNotes = seedReferenceNotes(campaign);
  state.sharedReferenceImages = seedSharedImages(campaign);
  state.campaign = campaign;
  state.fear = 0;
  state.playerNotes = {};
  state.weaponOverrides = {};
  state.xpStatus = buildInitialXpStatus(characters);
  state.dirty = false;
  state.lastSavedAt = undefined;
}

export function getPlayerNotes(playerKey: string) {
  const state = bootstrapState();
  return state.playerNotes?.[playerKey] ?? "";
}

export function setPlayerNotes(playerKey: string, notes: string) {
  const state = bootstrapState();
  state.playerNotes = state.playerNotes ?? {};
  state.playerNotes[playerKey] = notes;
  markDirty();
  return state.playerNotes[playerKey];
}

export function setWeaponOverride(
  characterId: string,
  slot: "primary" | "secondary" | "tertiary",
  weapon: Weapon | null
) {
  const state = bootstrapState();
  state.weaponOverrides = state.weaponOverrides ?? {};
  const current = state.weaponOverrides[characterId] ?? {};
  state.weaponOverrides[characterId] = { ...current, [slot]: weapon };
  markDirty();
  return state.weaponOverrides[characterId];
}

export function getWeaponOverrides(characterId: string) {
  const state = bootstrapState();
  return state.weaponOverrides?.[characterId] ?? {};
}

export function getXpStatus(characterId: string) {
  const state = bootstrapState();
  return state.xpStatus?.[characterId] ?? { currentExperience: 0, currentLevel: 1 };
}

export function addExperience(character: Character, amount: number) {
  const state = bootstrapState();
  const baseNeeded = character.experienceNeeded ?? 10;
  const entry = state.xpStatus?.[character.id] ?? { currentExperience: 0, currentLevel: 1 };
  let currentLevel = entry.currentLevel ?? 1;
  let currentExperience = entry.currentExperience ?? 0;
  currentExperience += Math.max(0, amount);
  while (currentExperience >= requiredForLevel(baseNeeded, currentLevel)) {
    currentExperience -= requiredForLevel(baseNeeded, currentLevel);
    currentLevel += 1;
  }
  state.xpStatus = state.xpStatus ?? {};
  state.xpStatus[character.id] = { currentExperience, currentLevel };
  markDirty();
  return state.xpStatus[character.id];
}

function markDirty() {
  const state = bootstrapState();
  state.dirty = true;
}

function getStatePath(campaignId: string) {
  return path.join(process.cwd(), "data", "campaigns", campaignId, "state.json");
}

function readStateFile(campaignId: string) {
  const statePath = getStatePath(campaignId);
  if (!fs.existsSync(statePath)) return null;
  const raw = fs.readFileSync(statePath, "utf-8");
  const parsed = JSON.parse(raw) as GameState;
  const stat = fs.statSync(statePath);
  return { state: parsed, lastSavedAt: stat.mtimeMs };
}

function seedReferenceNotes(campaign?: Campaign) {
  const referenceNotes: Array<{
    id: string;
    author: string;
    text: string;
    createdAt: number;
    shared?: boolean;
  }> = [];
  const now = Date.now();
  if (Array.isArray(campaign?.dmNotes)) {
    campaign.dmNotes.forEach((entry, idx) => {
      const text = (entry?.note ?? "").toString().trim();
      if (!text) return;
      const isBriefing = text.toLowerCase().startsWith("briefing");
      referenceNotes.push({
        id: randomUUID(),
        author: "Dungeon Master",
        text,
        createdAt: now + idx,
        shared: isBriefing
      });
    });
  }
  return referenceNotes;
}

function seedSharedImages(campaign?: Campaign) {
  return (
    campaign?.referenceImages
      ?.filter((img) => img.title === "Nexus Lab Exterior" || img.url === "/lab-outside.png")
      .map(({ title, url }) => ({ title, url })) ?? []
  );
}

function buildInitialXpStatus(characters: Character[]) {
  return Object.fromEntries(
    characters.map((c) => [c.id, { currentExperience: 0, currentLevel: 1 }])
  );
}

function requiredForLevel(base: number, level: number) {
  return Math.round(base * Math.pow(1.1, Math.max(0, level - 1)));
}

