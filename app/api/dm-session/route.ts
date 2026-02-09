import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/dm-session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { adminKey } = body as { adminKey?: string };
  if (!adminKey) {
    return NextResponse.json({ error: "adminKey required" }, { status: 400 });
  }
  const session = createSession(adminKey);
  if (!session) {
    return NextResponse.json({ error: "invalid admin key" }, { status: 401 });
  }
  return NextResponse.json(session);
}
