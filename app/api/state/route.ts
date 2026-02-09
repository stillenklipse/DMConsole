export const dynamic = "force-dynamic";

import { getActiveCampaignId, loadCampaign, loadCharacters } from "@/lib/data";
import { StatBlock } from "@/types";
import {
  approveEvent,
  getEvents,
  getDirtyState,
  getPlayerNotes,
  getXpStatus,
  getWeaponOverrides,
  getState,
  getStats,
  recordNote,
  applyStatUpdate,
  syncStats,
  setNoteShare,
  setSharedReferenceImages,
  setFear,
  setPlayerNotes,
  setWeaponOverride,
  addExperience,
  updateCampaign
} from "@/lib/state";
import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/dm-session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerKey = searchParams.get("playerKey") ?? undefined;
  const status = (searchParams.get("status") as "pending" | "approved" | "rejected" | null) ?? undefined;

  const characters = loadCharacters();
  const campaign = loadCampaign();
  updateCampaign(campaign); // refresh cache each request

  const events = getEvents({ playerKey, status });

  const stats = getStats();
  const filteredStats = playerKey
    ? Object.fromEntries(characters.filter((c) => c.key === playerKey).map((c) => [c.id, stats[c.id]]))
    : stats;

  const weaponOverrides = playerKey
    ? (() => {
        const character = characters.find((c) => c.key === playerKey);
        return character ? { [character.id]: getWeaponOverrides(character.id) } : {};
      })()
    : Object.fromEntries(characters.map((c) => [c.id, getWeaponOverrides(c.id)]));
  const xpStatus = playerKey
    ? (() => {
        const character = characters.find((c) => c.key === playerKey);
        return character ? { [character.id]: getXpStatus(character.id) } : {};
      })()
    : Object.fromEntries(characters.map((c) => [c.id, getXpStatus(c.id)]));

  return NextResponse.json({
    characters: playerKey ? characters.filter((c) => c.key === playerKey) : characters,
    campaign,
    stats: filteredStats,
    events,
    referenceNotes: getState().referenceNotes,
    sharedReferenceImages: getState().sharedReferenceImages ?? [],
    fear: getState().fear ?? 0,
    activeCampaignId: getActiveCampaignId(),
    playerNotes: playerKey ? getPlayerNotes(playerKey) : undefined,
    weaponOverrides,
    xpStatus,
    ...getDirtyState()
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    playerKey,
    characterId,
    stats,
    note,
    type,
    shared,
    noteId,
    images,
    adminKey,
    sessionToken,
    fear,
    weapon,
    slot,
    xpAmount
  } = body as {
    playerKey?: string;
    characterId?: string;
    stats?: unknown;
    note?: string;
    type?:
      | "note"
      | "stat-update"
      | "stat-sync"
      | "note-share"
      | "images-share"
      | "fear"
      | "player-notes"
      | "weapon-assign"
      | "xp-add";
    shared?: boolean;
    noteId?: string;
    images?: { title: string; url: string }[];
    adminKey?: string;
    sessionToken?: string;
    fear?: number;
    weapon?: unknown;
    slot?: "primary" | "secondary" | "tertiary";
    xpAmount?: number;
  };

  if (type === "images-share") {
    const expected = process.env.DM_KEY ?? "dm-secret";
    const allowed = adminKey === expected || validateSession(sessionToken);
    if (!allowed) {
      return NextResponse.json({ error: "invalid admin key" }, { status: 401 });
    }
    if (!Array.isArray(images)) {
      return NextResponse.json({ error: "images must be provided" }, { status: 400 });
    }
    const updated = setSharedReferenceImages(images);
    return NextResponse.json({ sharedReferenceImages: updated });
  }

  if (type === "note" && note) {
    const created = recordNote(playerKey ?? "Dungeon Master", note, Boolean(shared));
    return NextResponse.json({ note: created });
  }

  if (type === "player-notes") {
    if (!playerKey || typeof note !== "string") {
      return NextResponse.json({ error: "playerKey and note are required" }, { status: 400 });
    }
    const updated = setPlayerNotes(playerKey, note);
    return NextResponse.json({ playerNotes: updated });
  }

  if (type === "weapon-assign") {
    if (!characterId || !slot) {
      return NextResponse.json({ error: "characterId and slot are required" }, { status: 400 });
    }
    const expected = process.env.DM_KEY ?? "dm-secret";
    let allowed = adminKey === expected || validateSession(sessionToken);
    if (!allowed && weapon == null && playerKey) {
      const characters = loadCharacters();
      const target = characters.find((c) => c.id === characterId);
      if (target && target.key === playerKey) {
        allowed = true;
      }
    }
    if (!allowed) {
      return NextResponse.json({ error: "invalid admin key" }, { status: 401 });
    }
    const updated = setWeaponOverride(characterId, slot, (weapon as any) ?? null);
    return NextResponse.json({ weaponOverrides: updated });
  }

  if (type === "xp-add") {
    if (!characterId || typeof xpAmount !== "number") {
      return NextResponse.json({ error: "characterId and xpAmount are required" }, { status: 400 });
    }
    const expected = process.env.DM_KEY ?? "dm-secret";
    const allowed = adminKey === expected || validateSession(sessionToken);
    if (!allowed) {
      return NextResponse.json({ error: "invalid admin key" }, { status: 401 });
    }
    const character = loadCharacters().find((c) => c.id === characterId);
    if (!character) {
      return NextResponse.json({ error: "character not found" }, { status: 404 });
    }
    const updated = addExperience(character, xpAmount);
    return NextResponse.json({ xpStatus: updated });
  }

  if (type === "fear") {
    const expected = process.env.DM_KEY ?? "dm-secret";
    const allowed = adminKey === expected || validateSession(sessionToken);
    if (!allowed) {
      return NextResponse.json({ error: "invalid admin key" }, { status: 401 });
    }
    if (typeof fear !== "number") {
      return NextResponse.json({ error: "fear must be a number" }, { status: 400 });
    }
    const updated = setFear(fear);
    return NextResponse.json({ fear: updated });
  }

  if (type === "stat-sync") {
    if (!characterId || typeof stats !== "object") {
      return NextResponse.json({ error: "characterId and stats are required" }, { status: 400 });
    }
    const characters = loadCharacters();
    const target = characters.find((c) => c.id === characterId);
    if (!target) {
      return NextResponse.json({ error: "character not found" }, { status: 404 });
    }
    if (playerKey && target.key !== playerKey) {
      return NextResponse.json({ error: "forbidden: playerKey does not own characterId" }, { status: 403 });
    }
    const updated = syncStats(characterId, stats as Partial<StatBlock>);
    if (!updated) return NextResponse.json({ error: "character not found" }, { status: 404 });
    return NextResponse.json({ stats: updated });
  }

  if (type === "note-share" && noteId !== undefined && typeof shared === "boolean") {
    const updated = setNoteShare(noteId, shared);
    if (!updated) return NextResponse.json({ error: "note not found" }, { status: 404 });
    return NextResponse.json({ note: updated });
  }

  if (type === "stat-update") {
    if (!playerKey || !characterId || typeof stats !== "object") {
      return NextResponse.json({ error: "playerKey, characterId, and stats are required" }, { status: 400 });
    }
    const characters = loadCharacters();
    const target = characters.find((c) => c.id === characterId);
    if (!target) return NextResponse.json({ error: "character not found" }, { status: 404 });
    if (target.key !== playerKey) return NextResponse.json({ error: "forbidden: playerKey does not own characterId" }, { status: 403 });
    const updated = applyStatUpdate(characterId, stats as Partial<StatBlock>);
    if (!updated) return NextResponse.json({ error: "character not found" }, { status: 404 });
    return NextResponse.json({ stats: updated });
  }

  return NextResponse.json({ error: "unsupported request" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { eventId, status, resolutionNote, adminKey, sessionToken } = body as {
    eventId?: string;
    status?: "approved" | "rejected";
    resolutionNote?: string;
    adminKey?: string;
    sessionToken?: string;
  };

  const expected = process.env.DM_KEY ?? "dm-secret";
  const allowed = adminKey === expected || validateSession(sessionToken);
  if (!allowed) {
    return NextResponse.json({ error: "invalid admin key" }, { status: 401 });
  }

  if (!eventId || !status) {
    return NextResponse.json({ error: "eventId and status required" }, { status: 400 });
  }

  const event = approveEvent(eventId, status, resolutionNote);
  if (!event) return NextResponse.json({ error: "event not found" }, { status: 404 });
  return NextResponse.json({ event });
}

