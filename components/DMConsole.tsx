"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Snackbar from "@mui/material/Snackbar";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { DungeonMasterNotes } from "@/components/DungeonMasterNotes";
import { Campaign, Character, GameEvent, StatBlock, Weapon } from "@/types";

type Props = {
  characters: Character[];
  campaign: Campaign;
};

export function DMConsole({ characters, campaign }: Props) {
  const [dmKey, setDmKey] = useState<string | null>(null);
  const [dmKeyInput, setDmKeyInput] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [campaignState, setCampaignState] = useState<Campaign>(campaign);
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
  const [campaigns, setCampaigns] = useState<Array<{ id: string; title: string; summary?: string }>>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string>("");
  const [dirty, setDirty] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved" | "error">("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [showLoadOptions, setShowLoadOptions] = useState<boolean>(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [previewLastSavedAt, setPreviewLastSavedAt] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [weaponUpgrades, setWeaponUpgrades] = useState<Weapon[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState<boolean>(false);
  const [upgradeCharacter, setUpgradeCharacter] = useState<Character | null>(null);
  const [upgradeSlot, setUpgradeSlot] = useState<"primary" | "secondary" | "tertiary">("primary");
  const [xpStatus, setXpStatus] = useState<Record<string, { currentExperience: number; currentLevel: number }>>({});
  const [xpOpen, setXpOpen] = useState<boolean>(false);
  const [xpCharacter, setXpCharacter] = useState<Character | null>(null);
  const [xpAmount, setXpAmount] = useState<string>("0");
  const [toastMessage, setToastMessage] = useState<string>("");
  const [toastTone, setToastTone] = useState<"info" | "success" | "warning" | "error">("info");
  const [toastOpen, setToastOpen] = useState<boolean>(false);
  const characterById = useMemo(() => Object.fromEntries(characters.map((c) => [c.id, c])), [characters]);
  const statusInfo = useMemo(() => {
    if (isLoading) {
      return { text: "Loading campaign data...", tone: "info" as const };
    }
    if (saveStatus === "saving") {
      return { text: "Saving state...", tone: "info" as const };
    }
    if (saveStatus === "error") {
      return { text: "Save failed.", tone: "error" as const };
    }
    if (saveStatus === "saved") {
      return { text: "State saved.", tone: "success" as const };
    }
    if (dirty) {
      return { text: "Unsaved changes", tone: "warning" as const };
    }
    if (lastSavedAt) {
      return { text: `Last saved ${new Date(lastSavedAt).toLocaleString()}`, tone: "neutral" as const };
    }
    return { text: "Ready", tone: "neutral" as const };
  }, [isLoading, saveStatus, dirty, lastSavedAt]);

  useEffect(() => {
    setCampaignState(campaign);
  }, [campaign]);

  useEffect(() => {
    const cached = window.localStorage.getItem("dm-key");
    const cachedSession = window.localStorage.getItem("dm-session");
    if (cached) {
      setDmKey(cached);
      setDmKeyInput(cached);
    }
    if (cachedSession) {
      setSessionToken(cachedSession);
    }
  }, []);

  useEffect(() => {
    if (!dmKey) return;
    const tick = async () => {
      if (!hasLoaded) {
        setIsLoading(true);
      }
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) {
        setToastMessage("Failed to load state.");
        setToastTone("error");
        setToastOpen(true);
        if (!hasLoaded) {
          setHasLoaded(true);
          setIsLoading(false);
        }
        return;
      }
      const data = await res.json();
      setEvents(data.events ?? []);
      setStats(data.stats ?? {});
      setSharedImages(data.sharedReferenceImages ?? []);
      if (typeof data.fear === "number") {
        setFear(data.fear);
      }
      if (typeof data.dirty === "boolean") {
        setDirty(data.dirty);
      }
      if (typeof data.lastSavedAt === "number") {
        setLastSavedAt(data.lastSavedAt);
      }
      if (typeof data.activeCampaignId === "string") {
        setActiveCampaignId(data.activeCampaignId);
      }
      if (data.campaign) {
        setCampaignState(data.campaign);
      }
      if (data.xpStatus) {
        setXpStatus(data.xpStatus);
      }
      if (!hasLoaded) {
        setHasLoaded(true);
        setIsLoading(false);
      }
    };
    tick();
    const interval = setInterval(tick, 2500);
    return () => clearInterval(interval);
  }, [dmKey, hasLoaded]);

  useEffect(() => {
    if (!dmKey) return;
    const loadCampaigns = async () => {
      const res = await fetch("/api/campaigns", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
      if (typeof data.activeId === "string") {
        setActiveCampaignId(data.activeId);
      }
    };
    loadCampaigns();
  }, [dmKey]);

  useEffect(() => {
    if (!dmKey) return;
    const loadUpgrades = async () => {
      const res = await fetch("/api/campaigns/upgrades", { cache: "no-store" });
      if (!res.ok) {
        setWeaponUpgrades([]);
        return;
      }
      const data = await res.json();
      setWeaponUpgrades(Array.isArray(data.upgrades) ? data.upgrades : []);
    };
    loadUpgrades();
  }, [dmKey, activeCampaignId]);

  useEffect(() => {
    if (!showLoadOptions) return;
    if (!selectedCampaignId) return;
    const fetchPreview = async () => {
      setPreviewLoading(true);
      const res = await fetch(`/api/campaigns/preview?campaignId=${encodeURIComponent(selectedCampaignId)}`, {
        cache: "no-store"
      });
      if (!res.ok) {
        setPreviewCampaign(null);
        setPreviewLastSavedAt(null);
        setPreviewLoading(false);
        return;
      }
      const data = await res.json();
      setPreviewCampaign(data.campaign ?? null);
      setPreviewLastSavedAt(typeof data.lastSavedAt === "number" ? data.lastSavedAt : null);
      setPreviewLoading(false);
    };
    fetchPreview();
  }, [showLoadOptions, selectedCampaignId]);

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
      body: JSON.stringify({ adminKey: dmKey, sessionToken, eventId, status })
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
      body: JSON.stringify({ type: "fear", fear: bounded, adminKey: dmKey, sessionToken })
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
      body: JSON.stringify({ type: "images-share", images: next, adminKey: dmKey, sessionToken })
    });
  };

  const ensureSession = async () => {
    if (sessionToken) return sessionToken;
    if (!dmKey) return null;
    const res = await fetch("/api/dm-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminKey: dmKey })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.token === "string") {
      window.localStorage.setItem("dm-session", data.token);
      setSessionToken(data.token);
      return data.token;
    }
    return null;
  };

  const saveCampaignState = async () => {
    setSaveStatus("saving");
    const token = await ensureSession();
    if (!token) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 2500);
      return;
    }
    const res = await fetch("/api/campaigns/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: token, adminKey: dmKey })
    });
    if (!res.ok) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 2500);
      return;
    }
    const data = await res.json();
    setDirty(Boolean(data.dirty));
    if (typeof data.lastSavedAt === "number") {
      setLastSavedAt(data.lastSavedAt);
    }
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(""), 2500);
  };

  const activateCampaign = async (campaignId: string) => {
    if (!campaignId || campaignId === activeCampaignId) return;
    let force = false;
    if (dirty) {
      const confirmed = window.confirm("Unsaved changes will be lost. Continue without saving?");
      if (!confirmed) return;
      force = true;
    }
    setToastMessage("Switching campaign...");
    setToastTone("info");
    setToastOpen(true);
    const token = await ensureSession();
    if (!token) {
      setToastMessage("DM session invalid.");
      setToastTone("error");
      setToastOpen(true);
      return false;
    }
    const res = await fetch("/api/campaigns/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: token, campaignId, force, adminKey: dmKey })
    });
    if (res.status === 409) {
      setToastMessage("Unsaved changes - save before switching.");
      setToastTone("warning");
      setToastOpen(true);
      return false;
    }
    if (!res.ok) {
      setToastMessage("Switch failed.");
      setToastTone("error");
      setToastOpen(true);
      return false;
    }
    const data = await res.json();
    if (typeof data.activeId === "string") {
      setActiveCampaignId(data.activeId);
    }
    setDirty(false);
    setToastMessage("Campaign switched.");
    setToastTone("success");
    setToastOpen(true);
    return true;
  };

  const toggleLoadOptions = () => {
    if (!showLoadOptions) {
      const initialId = activeCampaignId || campaigns[0]?.id || "";
      setSelectedCampaignId(initialId);
    }
    setShowLoadOptions((prev) => !prev);
  };

  const confirmLoadCampaign = async () => {
    if (!selectedCampaignId || selectedCampaignId === activeCampaignId) return;
    const loaded = await activateCampaign(selectedCampaignId);
    if (loaded) {
      setShowLoadOptions(false);
    }
  };

  const openXpModal = (character: Character) => {
    setXpCharacter(character);
    setXpAmount("0");
    setXpOpen(true);
  };

  const requiredForLevel = (base: number, level: number) => {
    return Math.round(base * Math.pow(1.1, Math.max(0, level - 1)));
  };

  const addXp = async () => {
    if (!xpCharacter || !dmKey) return;
    const amount = Number(xpAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setToastMessage("Enter a valid XP amount.");
      setToastTone("warning");
      setToastOpen(true);
      return;
    }
    const token = await ensureSession();
    if (!token) {
      setToastMessage("DM session invalid.");
      setToastTone("error");
      setToastOpen(true);
      return;
    }
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "xp-add",
        characterId: xpCharacter.id,
        xpAmount: amount,
        adminKey: dmKey,
        sessionToken: token
      })
    });
    if (!res.ok) {
      setToastMessage("Failed to add XP.");
      setToastTone("error");
      setToastOpen(true);
      return;
    }
    const data = await res.json();
    if (data.xpStatus) {
      setXpStatus((prev) => ({ ...prev, [xpCharacter.id]: data.xpStatus }));
    }
    setToastMessage(`Added ${amount} XP to ${xpCharacter.name}.`);
    setToastTone("success");
    setToastOpen(true);
    setXpOpen(false);
  };

  const openUpgradeModal = (character: Character) => {
    setUpgradeCharacter(character);
    setUpgradeSlot("primary");
    setUpgradeOpen(true);
  };

  const assignUpgrade = async (weapon: Weapon) => {
    if (!upgradeCharacter || !dmKey) return;
    const token = await ensureSession();
    if (!token) {
      setToastMessage("DM session invalid.");
      setToastTone("error");
      setToastOpen(true);
      return;
    }
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "weapon-assign",
        characterId: upgradeCharacter.id,
        slot: upgradeSlot,
        weapon,
        adminKey: dmKey,
        sessionToken: token
      })
    });
    if (!res.ok) {
      setToastMessage("Weapon assign failed.");
      setToastTone("error");
      setToastOpen(true);
      return;
    }
    setToastMessage(`Assigned ${weapon.name} to ${upgradeCharacter.name}.`);
    setToastTone("success");
    setToastOpen(true);
    setUpgradeOpen(false);
  };

  if (!dmKey) {
    return (
      <div className="card stack">
        <h3>Dungeon Master key</h3>
        <input
          placeholder="Please enter the DM Key"
          value={dmKeyInput}
          onChange={(e) => setDmKeyInput(e.target.value)}
        />
        <button
          onClick={async () => {
            const trimmed = dmKeyInput.trim();
            if (!trimmed) return;
            window.localStorage.setItem("dm-key", trimmed);
            setDmKey(trimmed);
            const res = await fetch("/api/dm-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ adminKey: trimmed })
            });
            if (res.ok) {
              const data = await res.json();
              if (typeof data.token === "string") {
                window.localStorage.setItem("dm-session", data.token);
                setSessionToken(data.token);
              }
            }
          }}
        >
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card status-bar">
        <div className="status-main">
          <strong>Active campaign:</strong>
          <span>{campaignState.title}</span>
          {activeCampaignId && <small>({activeCampaignId})</small>}
        </div>
        <div className="status-actions">
          <button type="button" onClick={saveCampaignState}>
            Save state
          </button>
          <button type="button" onClick={toggleLoadOptions}>
            {showLoadOptions ? "Hide loader" : "Load campaign"}
          </button>
          <div className={`status-pill ${statusInfo.tone}`}>{statusInfo.text}</div>
        </div>
      </div>
      {showLoadOptions && (
        <div className="card stack">
          <h3>Load campaign</h3>
          <label>Choose campaign</label>
          <select
            value={selectedCampaignId || ""}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            style={{ maxWidth: 320 }}
          >
            <option value="" disabled>
              Select campaign
            </option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <div className="card stack" style={{ background: "rgba(0,0,0,0.12)" }}>
            {previewLoading ? (
              <small style={{ color: "var(--muted)" }}>Loading preview...</small>
            ) : previewCampaign ? (
              <>
                <strong>{previewCampaign.title}</strong>
                {previewCampaign.summary && <small style={{ color: "var(--muted)" }}>{previewCampaign.summary}</small>}
                <small style={{ color: "var(--muted)" }}>
                  {previewLastSavedAt
                    ? `Last saved ${new Date(previewLastSavedAt).toLocaleString()}`
                    : "No saved state yet"}
                </small>
              </>
            ) : (
              <small style={{ color: "var(--muted)" }}>Select a campaign to preview.</small>
            )}
          </div>
          <div className="row">
            <button
              type="button"
              onClick={confirmLoadCampaign}
              disabled={!selectedCampaignId || selectedCampaignId === activeCampaignId}
            >
              Load selected campaign
            </button>
            <button type="button" onClick={() => setShowLoadOptions(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
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
                  <th>XP</th>
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
                  const xpEntry = xpStatus[c.id] ?? { currentExperience: 0, currentLevel: 1 };
                  const xpBase = c.experienceNeeded ?? 10;
                  const xpNeeded = requiredForLevel(xpBase, xpEntry.currentLevel);
                  const xpDisplay = `${xpEntry.currentExperience}/${xpNeeded}`;
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{hpDisplay}</td>
                      <td>{hope}</td>
                      <td>{stress}</td>
                      <td>{armorDisplay}</td>
                      <td>{expDisplay}</td>
                      <td>{xpDisplay}</td>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <Link href={`/p/${encodeURIComponent(c.key)}`}>
                            <button type="button">View</button>
                          </Link>
                          <button
                            type="button"
                            onClick={() => openUpgradeModal(c)}
                            style={{ background: "#22c55e" }}
                          >
                            Upgrade
                          </button>
                          <button type="button" onClick={() => openXpModal(c)}>
                            Add XP
                          </button>
                        </div>
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
          {campaignState.npcs?.length ? (
            <div className="stack">
              {campaignState.npcs.map((n) => (
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
          {campaignState.plotDetails?.length ? (
            <>
              <h2 style={{ marginTop: 12 }}>Plot Details</h2>
              <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                {campaignState.plotDetails.map((p, idx) => (
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
          {campaignState.enemies?.length ? (
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
                {campaignState.enemies.map((e) => (
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
          {campaignState.locations?.length ? (
            <div className="stack">
              {campaignState.locations.map((loc) => (
                <div key={loc.name} className="card" style={{ padding: 8 }}>
                  <strong>{loc.name}</strong>
                  {loc.detail && <div style={{ color: "var(--muted)" }}>{loc.detail}</div>}
                </div>
              ))}
              {campaignState.referenceImages?.length ? (
                <div className="stack" style={{ gap: 12 }}>
                  <div className="row" style={{ alignItems: "center", gap: 8 }}>
                    <h3 style={{ margin: 0, flex: 1 }}>Reference Images</h3>
                    <small style={{ color: "var(--muted)" }}>
                      Toggle &quot;Show on Reference&quot; to publish to the player reference page.
                    </small>
                  </div>
                  <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                    {campaignState.referenceImages.map((img) => {
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
        <div>{campaignState.title}</div>
        <small style={{ color: "var(--muted)" }}>{campaignState.summary}</small>
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
      <Snackbar
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert onClose={() => setToastOpen(false)} severity={toastTone} variant="filled" sx={{ width: "100%" }}>
          {toastMessage}
        </Alert>
      </Snackbar>
      <Dialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upgrade Weapon</DialogTitle>
        <DialogContent dividers>
          {upgradeCharacter && (
            <div className="stack" style={{ gap: 12 }}>
              <div>
                <strong>{upgradeCharacter.name}</strong>
                <small style={{ marginLeft: 8, color: "var(--muted)" }}>{upgradeCharacter.class ?? ""}</small>
              </div>
              <FormControl size="small" fullWidth>
                <InputLabel id="upgrade-slot-label">Slot</InputLabel>
                <Select
                  labelId="upgrade-slot-label"
                  label="Slot"
                  value={upgradeSlot}
                  onChange={(e) => setUpgradeSlot(e.target.value as "primary" | "secondary" | "tertiary")}
                >
                  <MenuItem value="primary">Primary</MenuItem>
                  <MenuItem value="secondary">Secondary</MenuItem>
                  <MenuItem value="tertiary">Tertiary</MenuItem>
                </Select>
              </FormControl>
              {weaponUpgrades.length === 0 ? (
                <small style={{ color: "var(--muted)" }}>No upgrades available.</small>
              ) : (
                <div className="stack" style={{ gap: 12 }}>
                  {weaponUpgrades.map((w) => (
                    <div key={w.id ?? w.name} className="card stack" style={{ padding: 12 }}>
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <strong>{w.name}</strong>
                        <button type="button" onClick={() => assignUpgrade(w)}>
                          Assign
                        </button>
                      </div>
                      {w.trait && (
                        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                          <span>Trait</span>
                          <span>{w.trait}</span>
                        </div>
                      )}
                      {w.damage && (
                        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                          <span>Damage</span>
                          <span>{w.damage}</span>
                        </div>
                      )}
                      {w.notes && (
                        <div className="row" style={{ justifyContent: "flex-start", color: "var(--muted)" }}>
                          <small>{w.notes}</small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={xpOpen} onClose={() => setXpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Experience</DialogTitle>
        <DialogContent dividers>
          {xpCharacter && (
            <div className="stack" style={{ gap: 12 }}>
              <div>
                <strong>{xpCharacter.name}</strong>
                <small style={{ marginLeft: 8, color: "var(--muted)" }}>{xpCharacter.class ?? ""}</small>
              </div>
              {(() => {
                const xp = xpStatus[xpCharacter.id] ?? { currentExperience: 0, currentLevel: 1 };
                const baseNeeded = xpCharacter.experienceNeeded ?? 10;
                const needed = requiredForLevel(baseNeeded, xp.currentLevel);
                return (
                  <div className="stack" style={{ gap: 6 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span>Current XP</span>
                      <strong>{xp.currentExperience}</strong>
                    </div>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span>XP Needed</span>
                      <strong>{needed}</strong>
                    </div>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span>Level</span>
                      <strong>{xp.currentLevel}</strong>
                    </div>
                  </div>
                );
              })()}
              <label>Add XP</label>
              <input
                type="number"
                min={0}
                value={xpAmount}
                onChange={(e) => setXpAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setXpOpen(false)}>Cancel</Button>
          <Button onClick={addXp}>Add XP</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

