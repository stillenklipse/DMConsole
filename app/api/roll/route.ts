import { recordRoll } from "@/lib/state";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerKey, characterId, die, result, modifiers, total, note, payload } = body as {
    playerKey?: string;
    characterId?: string;
    die?: string;
    result?: number;
    modifiers?: { label: string; value: number }[];
    total?: number;
    note?: string;
    payload?: Record<string, unknown>;
  };

  if (!playerKey || !characterId || !die || typeof result !== "number" || typeof total !== "number") {
    return NextResponse.json({ error: "playerKey, characterId, die, result, and total required" }, { status: 400 });
  }

  const event = recordRoll({ playerKey, characterId, die, result, modifiers, total, note, payload });
  return NextResponse.json({ event });
}

