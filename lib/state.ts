import { loadCampaign, loadCharacters, mergeStats } from "@/lib/data";
import { Campaign, GameEvent, GameState, StatBlock } from "@/types";
import { randomUUID } from "crypto";

type MutableState = GameState & { campaign?: Campaign };

const globalState = globalThis as unknown as { __GAME_STATE?: MutableState };

function bootstrapState(): MutableState {
  if (!globalState.__GAME_STATE) {
    const characters = loadCharacters();
    const campaign = loadCampaign();
    const stats: Record<string, StatBlock> = {};
    characters.forEach((c) => {
      stats[c.id] = c.stats;
    });

    // Seed Dungeon Master notes from campaign.dmNotes (new schema)
    // Only share the initial "Briefing" note at game start; DM can toggle others later.
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
          shared: isBriefing // only the briefing note is shared by default
        });
      });
    }

    // Seed reference images: only share the Nexus Lab exterior at start.
    const sharedReferenceImages =
      campaign?.referenceImages
        ?.filter((img) => img.title === "Nexus Lab Exterior" || img.url === "/lab-outside.png")
        .map(({ title, url }) => ({ title, url })) ?? [];

    globalState.__GAME_STATE = {
      stats,
      events: [],
      referenceNotes,
      sharedReferenceImages,
      campaign,
      fear: 0
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
  return event;
}

export function recordNote(author: string, text: string, shared = false) {
  const state = bootstrapState();
  const note = { id: randomUUID(), author: author || "Dungeon Master", text, createdAt: Date.now(), shared };
  state.referenceNotes.unshift(note);
  return note;
}

export function setNoteShare(noteId: string, shared: boolean) {
  const state = bootstrapState();
  const note = state.referenceNotes.find((n) => n.id === noteId);
  if (!note) return undefined;
  note.shared = shared;
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
  return state.stats[characterId];
}

export function applyStatUpdate(characterId: string, stats: Partial<StatBlock>) {
  const state = bootstrapState();
  if (!state.stats[characterId]) return undefined;
  state.stats[characterId] = mergeStats(state.stats[characterId], stats);
  return state.stats[characterId];
}

export function setFear(value: number) {
  const state = bootstrapState();
  const clamped = Math.max(0, Math.min(12, value));
  state.fear = clamped;
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
  return state.sharedReferenceImages;
}

