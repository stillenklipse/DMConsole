import { loadCampaign, loadCharacters } from "@/lib/data";
import { getEvents } from "@/lib/state";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3:8b";
const MAX_SNIPPET_CHARS = 1200;
const MAX_EVENTS = 5;

function loadPdfSnippet() {
  try {
    const p = path.join(process.cwd(), "data", "pdf-extract.json");
    if (!fs.existsSync(p)) return "";
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as Array<{ file: string; text?: string }>;
    const combined = parsed
      .map((e) => `${e.file}:\n${(e.text ?? "").slice(0, MAX_SNIPPET_CHARS)}`)
      .join("\n---\n");
    return combined.slice(0, MAX_SNIPPET_CHARS);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userPrompt = (body?.prompt as string | undefined)?.trim();

  const campaign = loadCampaign();
  const characters = loadCharacters();
  const events = getEvents().slice(0, MAX_EVENTS);
  const pdfSnippets = loadPdfSnippet();

  const system = [
    "You are a concise, game-ready narrative assistant for a Daggerheart one-shot.",
    "Return short outputs (<=120 words).",
    "Tone: helpful GM aide; give hooks, twists, and consequences."
  ].join("\n");

  const context = [
    `Campaign: ${campaign.title}`,
    `Summary: ${campaign.summary ?? "n/a"}`,
    `Characters: ${characters.map((c) => `${c.name}(${c.key})`).join(", ")}`,
    events.length
      ? `Pending events:\n${events
          .map((e) => `- ${e.type} by ${e.playerKey ?? "unknown"}: ${JSON.stringify(e.payload).slice(0, 140)}`)
          .join("\n")}`
      : "Pending events: none",
    pdfSnippets ? `PDF context:\n${pdfSnippets}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt =
    userPrompt && userPrompt.length > 0
      ? `${system}\n\nContext:\n${context}\n\nUser request:\n${userPrompt}`
      : `${system}\n\nContext:\n${context}\n\nTask: Propose a next beat with 2 hooks and 1 complication.`;

  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false
      })
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Ollama error: ${text}` }, { status: 500 });
    }

    const data = (await res.json()) as { response?: string };
    return NextResponse.json({
      message: (data.response ?? "").trim(),
      model: OLLAMA_MODEL
    });
  } catch (err) {
    return NextResponse.json({ error: `Failed to call Ollama: ${(err as Error).message}` }, { status: 500 });
  }
}

