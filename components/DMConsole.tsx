"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Snackbar from "@mui/material/Snackbar";
import Button from "@mui/material/Button";
import { DungeonMasterNotes } from "@/components/DungeonMasterNotes";
import { Campaign, Character, GameEvent, StatBlock } from "@/types";

type Props = {
  characters: Character[];
  campaign: Campaign;
};

export function DMConsole({ characters, campaign }: Props) {
  const [dmKey, setDmKey] = useState<string | null>(null);
  const [dmKeyInput, setDmKeyInput] = useState<string>("");
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [stats, setStats] = useState<Record<string, StatBlock>>({});
  const [llmMessage, setLlmMessage] = useState<string>("");
  const [llmInput, setLlmInput] = useState<string>("");
  const [llmStatus, setLlmStatus] = useState<string>("");
  const [llmLoading, setLlmLoading] = useState<boolean>(false);
  const [fear, setFear] = useState<number>(0);
  const [sharedImages, setSharedImages] = useState<{ title: string; url: string }[]>([]);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const [lastRollId, setLastRollId] = useState<string | null>(null);
  const characterById = useMemo(() => Object.fromEntries(characters.map((c) => [c.id, c])), [characters]);

  useEffect(() => {
    const cached = window.localStorage.getItem("dm-key");
    if (cached) {
      setDmKey(cached);
      setDmKeyInput(cached);
    }
  }, []);

  useEffect(() => {
    if (!dmKey) return;
    const tick = async () => {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setEvents(data.events ?? []);
      setStats(data.stats ?? {});
      setSharedImages(data.sharedReferenceImages ?? []);
      if (typeof data.fear === "number") {
        setFear(data.fear);
      }
    };
    tick();
    const interval = setInterval(tick, 2500);
    return () => clearInterval(interval);
  }, [dmKey]);

  const pending = useMemo(() => events.filter((e) => e.status === "pending"), [events]);
  const pendingByPlayer = useMemo(
    () =>
      characters.map((c) => ({
        character: c,
        events: pending.filter((e) => e.playerKey === c.key)
      })),
    [characters, pending]
  );

  useEffect(() => {
    if (!events.length) return;
    const latestRoll = events.find((e) => e.type === "roll");
    if (latestRoll && latestRoll.id !== lastRollId) {
      const p: any = latestRoll.payload;
      const inner = p?.payload ?? p ?? {};
      const hope = inner?.hopeRoll;
      const fear = inner?.fearRoll;
      const mod = inner?.modifier;
      const label = inner?.modifierLabel ?? "mod";
      const total =
        p?.total ??
        inner?.total ??
        (hope !== undefined && fear !== undefined ? hope + fear + (mod ?? 0) : p?.result ?? inner?.result);
      const crit = inner?.critical ? " • CRITICAL" : "";
      const who = characterById[latestRoll.characterId ?? ""]?.name ?? "Player";
      const msg =
        hope !== undefined && fear !== undefined && mod !== undefined
          ? `${who} — Hope ${hope} + Fear ${fear} + ${label} ${mod >= 0 ? "+" : ""}${mod} = ${total}${crit}`
          : `${who} — ${p?.die ?? "roll"} = ${p?.result ?? ""}${crit}`;
      setSnackMessage(msg);
      setSnackOpen(true);
      setLastRollId(latestRoll.id);
    }
  }, [events, lastRollId, characterById]);

  const approve = async (eventId: string, status: "approved" | "rejected") => {
    if (!dmKey) return;
    const res = await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminKey: dmKey, eventId, status })
    });
    if (status === "rejected" && res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  const updateFear = async (next: number) => {
    const bounded = Math.max(0, Math.min(12, next));
    setFear(bounded);
    if (!dmKey) return;
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "fear", fear: bounded, adminKey: dmKey })
    });
  };

  const callLLM = async (prompt?: string) => {
    setLlmStatus("Contacting LLM...");
    setLlmLoading(true);
    setLlmMessage("");
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt ?? llmInput })
    });
    if (!res.ok) {
      setLlmStatus("LLM call failed");
      setLlmLoading(false);
      return;
    }
    const data = await res.json();
    setLlmMessage(data.message ?? "No response");
    setLlmStatus(data.model ? `Model: ${data.model}` : "OK");
    setLlmLoading(false);
  };

  const toggleImageShare = async (img: { title: string; url: string }) => {
    if (!dmKey) return;
    const exists = sharedImages.some((i) => i.url === img.url);
    const next = exists ? sharedImages.filter((i) => i.url !== img.url) : [...sharedImages, img];
    setSharedImages(next);
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "images-share", images: next, adminKey: dmKey })
    });
  };

  if (!dmKey) {
    return (
      <div className="card stack">
        <h3>Dungeon Master key</h3>
        <input
          placeholder="dm-secret"
          value={dmKeyInput}
          onChange={(e) => setDmKeyInput(e.target.value)}
        />
        <button
          onClick={() => {
            const trimmed = dmKeyInput.trim();
            if (!trimmed) return;
            window.localStorage.setItem("dm-key", trimmed);
            setDmKey(trimmed);
          }}
        >
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row">
        <div className="card stack" style={{ flex: 1, minWidth: 320 }}>
          <div className="card stack">
            <h3>Fear counter</h3>
            <label>Fear ({fear})</label>
            <input
              type="range"
              min={0}
              max={12}
              value={fear}
              onChange={(e) => updateFear(Number(e.target.value))}
            />
            <div className="row" style={{ gap: 8 }}>
              <button type="button" onClick={() => updateFear(fear + 1)}>
                Add Fear
              </button>
              <button type="button" onClick={() => updateFear(fear - 1)}>
                Spend/Reduce Fear (-1)
              </button>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <small style={{ color: "var(--muted)" }}>Max 12; manually adjust as you spend/gain.</small>
              <h4 style={{ margin: 0 }}>Difficulty Curve</h4>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                {[5, 10, 15, 20, 25, 30].map((val, idx, arr) => {
                  const ratio = idx / (arr.length - 1);
                  const r = Math.round(0x22 + (0xef - 0x22) * ratio);
                  const g = Math.round(0xc5 + (0x44 - 0xc5) * ratio);
                  const b = Math.round(0x5e + (0x44 - 0x5e) * ratio);
                  const bg = `rgb(${r}, ${g}, ${b})`;
                  return (
                    <div
                      key={val}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        background: bg,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700
                      }}
                      title={`Difficulty ${val}`}
                    >
                      {val}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card stack">
            <h3>Live stats</h3>
            <table>
              <thead>
                <tr>
                  <th>Character</th>
                  <th>HP</th>
                  <th>Hope</th>
                  <th>Stress</th>
                  <th>Armor Slots</th>
                  <th>Experience</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {characters.map((c) => {
                  const s = stats[c.id] ?? c.stats;
                  const currentHp = (s as any)?.custom?.currentHp;
                  const hope =
                    (s as any).hope ??
                    (s as any)?.custom?.hope ??
                    (c as any).hope ??
                    "—";
                  const stress = (s as any).stress ?? (s as any)?.custom?.stress ?? "—";
                  const hpDisplay =
                    typeof currentHp === "number" ? `${currentHp}/${s.hp}` : s.hp;
                  const armorSlots = (s as any)?.custom?.armorSlotsUsed;
                  const armorUsed = Array.isArray(armorSlots) ? armorSlots.filter(Boolean).length : undefined;
                  const armorTotal = c.defense?.armorSlots ?? (Array.isArray(armorSlots) ? armorSlots.length : undefined);
                  const armorDisplay =
                    armorUsed !== undefined && armorTotal !== undefined ? `${armorUsed}/${armorTotal}` : "—";
                  const expUsage = (s as any)?.custom?.experienceUsage;
                  const expTotal = c.experiences?.length ?? 0;
                  const expUsed =
                    Array.isArray(expUsage) && expTotal > 0
                      ? expUsage.slice(0, expTotal).filter(Boolean).length
                      : 0;
                  const expDisplay = expTotal > 0 ? `${expUsed}/${expTotal}` : "—";
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{hpDisplay}</td>
                      <td>{hope}</td>
                      <td>{stress}</td>
                      <td>{armorDisplay}</td>
                      <td>{expDisplay}</td>
                      <td>
                        <Link href={`/p/${encodeURIComponent(c.key)}`}>
                          <button type="button">View</button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending approvals removed (no longer needed) */}
      </div>

      <div className="row">
        <div className="card stack" style={{ flex: 1, minWidth: 320 }}>
          <h2>NPCs</h2>
          {campaign.npcs?.length ? (
            <div className="stack">
              {campaign.npcs.map((n) => (
                <div key={n.name} className="card" style={{ padding: 8 }}>
                  <div>
                    <strong>{n.name}</strong> — {n.role}
                  </div>
                  {n.note && (
                    <div style={{ color: "var(--muted)", marginTop: 6, whiteSpace: "pre-wrap" }}>
                      {n.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <small style={{ color: "var(--muted)" }}>No NPCs listed.</small>
          )}
          {campaign.plotDetails?.length ? (
            <>
              <h2 style={{ marginTop: 12 }}>Plot Details</h2>
              <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                {campaign.plotDetails.map((p, idx) => (
                  <div key={idx} className="card" style={{ padding: 8, flex: "1 1 260px" }}>
                    {p}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <div className="card stack" style={{ flex: 1, minWidth: 320 }}>
          <h2>Enemies</h2>
          {campaign.enemies?.length ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Threat</th>
                  <th>HP</th>
                  <th>Attack</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {campaign.enemies.map((e) => (
                  <tr key={e.name}>
                    <td>{e.name}</td>
                    <td>{e.threat ?? "—"}</td>
                    <td>{e.hp ?? "—"}</td>
                    <td>{e.attack ?? "—"}</td>
                    <td style={{ maxWidth: 260 }}>{e.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <small style={{ color: "var(--muted)" }}>No enemies listed.</small>
          )}
        </div>
      </div>

      <div className="row">
        <div className="card stack" style={{ flex: 1, minWidth: 320 }}>
          <DungeonMasterNotes />
        </div>

        <div className="card stack" style={{ flex: 1, minWidth: 320 }}>
          <h2>Location Details</h2>
          {campaign.locations?.length ? (
            <div className="stack">
              {campaign.locations.map((loc) => (
                <div key={loc.name} className="card" style={{ padding: 8 }}>
                  <strong>{loc.name}</strong>
                  {loc.detail && <div style={{ color: "var(--muted)" }}>{loc.detail}</div>}
                </div>
              ))}
              {campaign.referenceImages?.length ? (
                <div className="stack" style={{ gap: 12 }}>
                  <div className="row" style={{ alignItems: "center", gap: 8 }}>
                    <h3 style={{ margin: 0, flex: 1 }}>Reference Images</h3>
                    <small style={{ color: "var(--muted)" }}>
                      Toggle &quot;Show on Reference&quot; to publish to the player reference page.
                    </small>
                  </div>
                  <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                    {campaign.referenceImages.map((img) => {
                      const checked = sharedImages.some((i) => i.url === img.url);
                      return (
                        <div key={img.url} className="card stack" style={{ padding: 8, width: 220, gap: 8 }}>
                          <div style={{ marginBottom: 2, fontWeight: 600 }}>{img.title}</div>
                          <img src={img.url} alt={img.title} style={{ maxWidth: "100%", borderRadius: 6 }} />
                          <label style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleImageShare(img)}
                              aria-label={`Share ${img.title}`}
                              style={{ width: 20, height: 20 }}
                            />
                            <small style={{ margin: 0 }}>Show on Reference</small>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <small style={{ color: "var(--muted)" }}>No reference images.</small>
              )}
            </div>
          ) : (
            <small style={{ color: "var(--muted)" }}>No locations listed.</small>
          )}
        </div>
      </div>

      <div className="card stack">
        <h2>Campaign</h2>
        <div>{campaign.title}</div>
        <small style={{ color: "var(--muted)" }}>{campaign.summary}</small>
        <div className="stack">
          <label>Share Prompt</label>
          <textarea
            value={llmInput}
            onChange={(e) => setLlmInput(e.target.value)}
            placeholder="Ask for a beat, NPC hook, recap, or complication..."
          />
          <div className="row" style={{ gap: 8 }}>
            <button type="button" onClick={() => callLLM()} disabled={llmLoading}>
              Ask llama
            </button>
            {llmLoading && <small style={{ color: "var(--muted)" }}>Working...</small>}
          </div>
          {llmStatus && <small style={{ color: "var(--muted)" }}>{llmStatus}</small>}
          {llmMessage && <div className="card" style={{ padding: 8 }}>{llmMessage}</div>}
        </div>
      </div>

      <Snackbar
        open={snackOpen}
        onClose={() => setSnackOpen(false)}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        message={snackMessage}
        action={
          <Button color="inherit" size="small" onClick={() => setSnackOpen(false)}>
            Dismiss
          </Button>
        }
      />
    </div>
  );
}

