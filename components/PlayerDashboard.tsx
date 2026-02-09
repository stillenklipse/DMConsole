"use client";

import { useEffect, useRef, useState } from "react";
import { Character, StatBlock, Weapon } from "@/types";
import { DiceRoller } from "@/components/DiceRoller";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Checkbox from "@mui/material/Checkbox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

type Props = {
  playerKey: string;
  character: Character;
  initialStats: StatBlock;
};

export function PlayerDashboard({ playerKey, character, initialStats }: Props) {
  const [stats, setStats] = useState<StatBlock>(initialStats);
  const traitLabels = ["Strength", "Agility", "Finesse", "Instinct", "Knowledge", "Presence"] as const;
  const [hope, setHope] = useState<number>(character.hope ?? 0);
  const [stress, setStress] = useState<number>(0);
  const [maxHp, setMaxHp] = useState<number>(initialStats.hp);
  const [currentHp, setCurrentHp] = useState<number>((initialStats as any)?.custom?.currentHp ?? initialStats.hp);
  const [armorSlotsUsed, setArmorSlotsUsed] = useState<boolean[]>(
    Array.isArray((initialStats as any)?.custom?.armorSlotsUsed)
      ? (initialStats as any).custom.armorSlotsUsed
      : Array.from({ length: character.defense?.armorSlots ?? 0 }, () => false)
  );
  const [focusSlotsUsed, setFocusSlotsUsed] = useState<boolean[]>(
    Array.isArray((initialStats as any)?.custom?.focusSlotsUsed)
      ? (initialStats as any).custom.focusSlotsUsed
      : Array.from({ length: initialStats.focus ?? 0 }, () => false)
  );
  const [armorStatus, setArmorStatus] = useState<string>("");
  const [usedExperiences, setUsedExperiences] = useState<boolean[]>(
    (() => {
      const len = character.experiences?.length ?? 0;
      const usage = (initialStats as any)?.custom?.experienceUsage;
      if (Array.isArray(usage)) {
        return Array.from({ length: len }, (_, i) => Boolean(usage[i]));
      }
      return Array.from({ length: len }, () => false);
    })()
  );
  const [experienceStatus, setExperienceStatus] = useState<string>("");
  const [playerNotes, setPlayerNotes] = useState<string>("");
  const [notesStatus, setNotesStatus] = useState<string>("");
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [lastServerNotes, setLastServerNotes] = useState<string>("");
  const [weaponOverrides, setWeaponOverrides] = useState<{
    primary?: Weapon | null;
    secondary?: Weapon | null;
    tertiary?: Weapon | null;
  }>({});
  const [weaponStatus, setWeaponStatus] = useState<string>("");
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [currentExperience, setCurrentExperience] = useState<number>(0);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply initial server stats (including custom fields) on first render / prop change
  useEffect(() => {
    setStats(initialStats);
    const serverCurrentHp = (initialStats as any)?.custom?.currentHp;
    if (typeof serverCurrentHp === "number") {
      setCurrentHp(Math.min(serverCurrentHp, initialStats.hp ?? serverCurrentHp));
    }
    const initialHope = (initialStats as any)?.hope ?? (initialStats as any)?.custom?.hope;
    if (typeof initialHope === "number") setHope(initialHope);
    const initialStress = (initialStats as any)?.stress ?? (initialStats as any)?.custom?.stress;
    if (typeof initialStress === "number") setStress(initialStress);
    const armorSlotsFromServer = (initialStats as any)?.custom?.armorSlotsUsed;
    if (Array.isArray(armorSlotsFromServer)) setArmorSlotsUsed(armorSlotsFromServer);
    const focusSlotsFromServer = (initialStats as any)?.custom?.focusSlotsUsed;
    if (Array.isArray(focusSlotsFromServer)) setFocusSlotsUsed(focusSlotsFromServer);
    const expUsage = (initialStats as any)?.custom?.experienceUsage;
    if (Array.isArray(expUsage)) {
      const len = character.experiences?.length ?? 0;
      setUsedExperiences(Array.from({ length: len }, (_, i) => Boolean(expUsage[i])));
    }
  }, [initialStats, character.experiences]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/state?playerKey=${encodeURIComponent(playerKey)}`);
      if (!res.ok) return;
      const data = await res.json();
      const updatedStats = data.stats?.[character.id];
      if (updatedStats) {
        setStats(updatedStats);
        setMaxHp(updatedStats.hp);
        const serverCurrentHp = (updatedStats as any)?.custom?.currentHp;
        if (typeof serverCurrentHp === "number") {
          setCurrentHp(Math.min(serverCurrentHp, updatedStats.hp ?? serverCurrentHp));
        } else {
          setCurrentHp((prev) => Math.min(prev, updatedStats.hp));
        }
        if (typeof updatedStats.hope === "number") {
          setHope(updatedStats.hope);
        }
        const updatedStress = (updatedStats as any)?.stress ?? (updatedStats as any)?.custom?.stress;
        if (typeof updatedStress === "number") {
          setStress(updatedStress);
        }
        const armorSlotsFromServer = (updatedStats as any)?.custom?.armorSlotsUsed;
        if (Array.isArray(armorSlotsFromServer)) {
          setArmorSlotsUsed(armorSlotsFromServer);
        }
        const focusSlotsFromServer = (updatedStats as any)?.custom?.focusSlotsUsed;
        if (Array.isArray(focusSlotsFromServer)) {
          setFocusSlotsUsed(focusSlotsFromServer);
        }
        const expUsage = (updatedStats as any)?.custom?.experienceUsage;
        if (Array.isArray(expUsage)) {
          const len = character.experiences?.length ?? 0;
          setUsedExperiences(Array.from({ length: len }, (_, i) => Boolean(expUsage[i])));
        }
      }
      if (typeof data.playerNotes === "string") {
        setLastServerNotes(data.playerNotes);
        if (!isEditingNotes) {
          setPlayerNotes(data.playerNotes);
        }
      }
      if (data.weaponOverrides?.[character.id]) {
        setWeaponOverrides(data.weaponOverrides[character.id]);
      }
      const xp = data.xpStatus?.[character.id];
      if (xp) {
        setCurrentLevel(xp.currentLevel ?? 1);
        setCurrentExperience(xp.currentExperience ?? 0);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [character.id, playerKey, isEditingNotes]);

  const resolveWeapon = (slot: "primary" | "secondary" | "tertiary") => {
    const override = weaponOverrides?.[slot];
    if (override === null) return null;
    if (override) return override;
    if (slot === "primary") return character.weapon ?? null;
    if (slot === "secondary") return character.secondaryWeapon ?? null;
    return character.tertiaryWeapon ?? null;
  };

  const experienceNeeded = character.experienceNeeded ?? 10;
  const requiredForLevel = (level: number) => {
    return Math.round(experienceNeeded * Math.pow(1.1, Math.max(0, level - 1)));
  };
  const requiredForCurrentLevel = requiredForLevel(currentLevel);
  const xpProgress = requiredForCurrentLevel > 0 ? Math.min(1, currentExperience / requiredForCurrentLevel) : 0;

  const dropWeapon = async (slot: "primary" | "secondary" | "tertiary") => {
    setWeaponStatus("Dropping weapon...");
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "weapon-assign",
        playerKey,
        characterId: character.id,
        slot,
        weapon: null
      })
    });
    setWeaponStatus(res.ok ? "Weapon dropped." : "Failed to drop weapon.");
    if (res.ok) {
      setWeaponOverrides((prev) => ({ ...prev, [slot]: null }));
    }
    setTimeout(() => setWeaponStatus(""), 2000);
  };

  const traitEntries = [
    { label: "Strength", value: character.traits?.strength ?? 0 },
    { label: "Agility", value: character.traits?.agility ?? 0 },
    { label: "Finesse", value: character.traits?.finesse ?? 0 },
    { label: "Instinct", value: character.traits?.instinct ?? 0 },
    { label: "Knowledge", value: character.traits?.knowledge ?? 0 },
    { label: "Presence", value: character.traits?.presence ?? 0 }
  ];
  const traitValid = (() => {
    const allowed = [-1, 0, 0, 1, 1, 2].sort((a, b) => a - b);
    const current = traitEntries.map((t) => t.value ?? 0).sort((a, b) => a - b);
    return allowed.length === current.length && allowed.every((v, i) => v === current[i]);
  })();

  useEffect(() => {
    setArmorSlotsUsed((prev) => {
      const nextLength = character.defense?.armorSlots ?? 0;
      const next = Array.from({ length: nextLength }, (_, i) => prev[i] ?? false);
      return next;
    });
  }, [character.defense?.armorSlots]);

  useEffect(() => {
    setUsedExperiences((prev) => {
      const nextLength = character.experiences?.length ?? 0;
      const next = Array.from({ length: nextLength }, (_, i) => prev[i] ?? false);
      return next;
    });
  }, [character.experiences?.length]);

  useEffect(() => {
    setFocusSlotsUsed((prev) => {
      const nextLength = stats.focus ?? 0;
      const next = Array.from({ length: nextLength }, (_, i) => prev[i] ?? false);
      return next;
    });
  }, [stats.focus]);

  const toggleArmorSlot = async (index: number) => {
    setArmorSlotsUsed((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      void sendArmorUpdate(next);
      return next;
    });
  };

  const sendArmorUpdate = async (slots: boolean[]) => {
    setArmorStatus("Updating...");
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerKey,
        characterId: character.id,
        stats: { custom: { armorSlotsUsed: slots } },
        type: "stat-update"
      })
    });
    setArmorStatus(res.ok ? "Updated armor slots." : "Failed to update.");
  };

  const toggleFocusSlot = (index: number) => {
    setFocusSlotsUsed((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      void sendFocusUpdate(next);
      return next;
    });
  };

  const sendFocusUpdate = async (slots: boolean[]) => {
    setArmorStatus("Updating...");
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerKey,
        characterId: character.id,
        stats: { custom: { focusSlotsUsed: slots } },
        type: "stat-update"
      })
    });
    setArmorStatus(res.ok ? "Updated focus slots." : "Failed to update.");
  };

  const toggleExperience = (idx: number) => {
    setUsedExperiences((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      void sendExperienceUpdate(next);
      return next;
    });
  };

  const sendExperienceUpdate = async (usage: boolean[]) => {
    setExperienceStatus("Updating...");
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerKey,
        characterId: character.id,
        stats: { custom: { experienceUsage: usage } },
        type: "stat-update"
      })
    });
    setExperienceStatus(res.ok ? "Experience updated." : "Failed to update.");
  };

  // Live sync basic vitals (hp, damage, hope, stress) to DM screen without waiting for approval
  useEffect(() => {
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }
    syncTimer.current = setTimeout(() => {
      void fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "stat-sync",
          playerKey,
          characterId: character.id,
          stats: {
            damage: stats.damage,
            focus: stats.focus,
            hope,
            stress,
            custom: { ...(stats.custom ?? {}), currentHp },
            notes: stats.notes
          }
        })
      });
    }, 400);

    return () => {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
      }
    };
  }, [currentHp, hope, stress, stats.damage, playerKey, character.id]);

  const saveNotes = async () => {
    setNotesStatus("Saving...");
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "player-notes",
        playerKey,
        note: playerNotes
      })
    });
    if (res.ok) {
      setNotesStatus("Notes saved.");
      setLastServerNotes(playerNotes);
      setIsEditingNotes(false);
    } else {
      setNotesStatus("Failed to save.");
    }
    setTimeout(() => setNotesStatus(""), 2000);
  };

  const imageName = character.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9_-]/g, "");
  const profileSrc = `/` + imageName + (imageName.endsWith(".png") ? "" : ".png");

  return (
    <div className="stack">
      <div className="row">
        <div className="card stack" style={{ flex: 1, minWidth: 260 }}>
          <h2>Dashboard: {character.name}</h2>
          <div className="stack" style={{ gap: 6 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <strong>Level {currentLevel}</strong>
              <small style={{ color: "var(--muted)" }}>Progress</small>
            </div>
            <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.12)", borderRadius: 999 }}>
              <div
                style={{
                  width: `${Math.round(xpProgress * 100)}%`,
                  height: "100%",
                  background: "#22c55e",
                  borderRadius: 999
                }}
              />
            </div>
          </div>
          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <img
              src={profileSrc}
              alt={character.name}
              style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 12 }}
            />
          </div>
          {character.notes && <p>{character.notes}</p>}
        </div>
        <div className="card stack" style={{ flex: 1, minWidth: 260 }}>
          <DiceRoller
            playerKey={playerKey}
            characterId={character.id}
            characterName={character.name}
            traits={{
              Strength: character.traits?.strength ?? 0,
              Agility: character.traits?.agility ?? 0,
              Finesse: character.traits?.finesse ?? 0,
              Instinct: character.traits?.instinct ?? 0,
              Knowledge: character.traits?.knowledge ?? 0,
              Presence: character.traits?.presence ?? 0
            }}
          />
        </div>
      </div>
      {traitEntries.length > 0 && (
        <div className="card stack">
          <div className="row" style={{ alignItems: "center", gap: 8 }}>
            <h3 style={{ margin: 0 }}>Traits</h3>
          </div>
          <table>
            <thead>
              <tr>
                {traitEntries.map((t) => (
                    <th key={t.label} style={{ textAlign: "center" }}>
                      {t.label}
                    </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {traitEntries.map((t) => (
                    <td key={t.label} style={{ textAlign: "center" }}>
                      {t.value ?? "—"}
                    </td>
                ))}
              </tr>
            </tbody>
          </table>
          <small
            style={{
              color: "#ef4444",
              display: "block",
              textAlign: "right"
            }}
          >
            {traitValid ? "Trait spread valid (+2, +1, +1, 0, 0, -1)" : "Invalid spread; data must match +2, +1, +1, 0, 0, -1"}
          </small>
        </div>
      )}
      <div className="row">
        <div className="card stack" style={{ flex: 1, minWidth: 260 }}>
          <h3>Evasion & Armor</h3>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span>Evasion</span>
            <span>{character.defense?.evasion ?? "—"}</span>
          </div>
          <div className="stack">
            <label>Armor Slots</label>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
              {Array.from({ length: character.defense?.armorSlots ?? 0 }).map((_, idx) => (
                <Checkbox
                  key={idx}
                  size="small"
                  icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                  checkedIcon={<CheckBoxIcon fontSize="small" />}
                  checked={armorSlotsUsed[idx] ?? false}
                  onChange={() => toggleArmorSlot(idx)}
                  inputProps={{ "aria-label": `Armor slot ${idx + 1}` }}
                  sx={{
                    color: "var(--muted)",
                    "&.Mui-checked": { color: "#22c55e" }
                  }}
                />
              ))}
              {(character.defense?.armorSlots ?? 0) === 0 && (
                <small style={{ color: "var(--muted)" }}>No armor slots</small>
              )}
            </div>
            <small style={{ color: "var(--muted)" }}>{armorStatus}</small>
          </div>
          <div style={{ borderTop: "1px solid #ccc", margin: "8px 0" }} />
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <strong>Armor:</strong>
            <span>{character.armor?.name ?? "—"}</span>
          </div>
          {character.armor?.thresholds && (
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span>Thresholds</span>
              <span>{character.armor.thresholds}</span>
            </div>
          )}
          {character.armor?.notes && (
            <div className="row" style={{ justifyContent: "flex-start", color: "var(--muted)" }}>
              <small>{character.armor.notes}</small>
            </div>
          )}
        </div>
        <div className="card stack" style={{ flex: 1, minWidth: 260 }}>
          <h3>Damage & Health</h3>
          <div className="stack" style={{ gap: 8 }}>
            <label>Health Points: {currentHp} / {maxHp}</label>
            <div className="row" style={{ alignItems: "center", gap: 8 }}>
              <IconButton
                size="small"
                aria-label="decrease hp"
                onClick={() => setCurrentHp((hp) => Math.max(0, hp - 1))}
                sx={{ color: "#ef4444", border: "1px solid #ef4444" }}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
              <input
                style={{ flex: 1 }}
                type="range"
                min={0}
                max={Math.max(0, maxHp)}
                value={currentHp}
                onChange={(e) => setCurrentHp(Number(e.target.value))}
              />
              <IconButton
                size="small"
                aria-label="increase hp"
                onClick={() => setCurrentHp((hp) => Math.min(maxHp, hp + 1))}
                sx={{ color: "#22c55e", border: "1px solid #22c55e" }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
          <div className="stack" style={{ fontSize: "0.9rem" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>Minor</th>
                  <th style={{ textAlign: "center" }}>Major</th>
                  <th style={{ textAlign: "center" }}>Severe</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "center" }}>{character.damageThresholds?.minor ?? "—"}</td>
                  <td style={{ textAlign: "center" }}>{character.damageThresholds?.major ?? "—"}</td>
                  <td style={{ textAlign: "center" }}>{character.damageThresholds?.severe ?? "—"}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: "center" }}>lose 1 HP</td>
                  <td style={{ textAlign: "center" }}>lose 2 HP</td>
                  <td style={{ textAlign: "center" }}>lose 3 HP</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="card stack" style={{ flex: 1, minWidth: 220 }}>
          <h3>Hope and Stress</h3>
          <label>Hope: {hope} / 6</label>
          <div className="row" style={{ alignItems: "center", gap: 8 }}>
            <IconButton
              size="small"
              aria-label="decrease hope"
              onClick={() => setHope((h) => Math.max(0, h - 1))}
              sx={{ color: "#ef4444", border: "1px solid #ef4444" }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
            <input
              style={{ flex: 1 }}
              type="range"
              min={0}
              max={6}
              value={hope}
              onChange={(e) => setHope(Number(e.target.value))}
            />
            <IconButton
              size="small"
              aria-label="increase hope"
              onClick={() => setHope((h) => Math.min(6, h + 1))}
              sx={{ color: "#22c55e", border: "1px solid #22c55e" }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </div>
          <label>Stress: {stress} / 6</label>
          <div className="row" style={{ alignItems: "center", gap: 8 }}>
            <IconButton
              size="small"
              aria-label="decrease stress"
              onClick={() => setStress((s) => Math.max(0, s - 1))}
              sx={{ color: "#ef4444", border: "1px solid #ef4444" }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
            <input
              style={{ flex: 1 }}
              type="range"
              min={0}
              max={6}
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
            />
            <IconButton
              size="small"
              aria-label="increase stress"
              onClick={() => setStress((s) => Math.min(6, s + 1))}
              sx={{ color: "#22c55e", border: "1px solid #22c55e" }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="card stack" style={{ flex: 1, minWidth: 240 }}>
          <h3>Weapons</h3>
          {(["primary", "secondary", "tertiary"] as const).map((slot) => {
            const weapon = resolveWeapon(slot);
            const label = slot === "primary" ? "Primary" : slot === "secondary" ? "Secondary" : "Tertiary";
            return (
              <div key={slot} className="stack" style={{ gap: 6 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{label}:</strong>
                  <span>{weapon?.name ?? "—"}</span>
                </div>
                {weapon ? (
                  <>
                    {weapon.trait && (
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", color: "var(--muted)" }}>
                        <span>Trait</span>
                        <span>{weapon.trait}</span>
                      </div>
                    )}
                    {weapon.damage && (
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <span>Damage</span>
                        <span>{weapon.damage}</span>
                      </div>
                    )}
                    {weapon.notes && (
                      <div className="row" style={{ justifyContent: "flex-start", color: "var(--muted)" }}>
                        <small>{weapon.notes}</small>
                      </div>
                    )}
                    <div className="row" style={{ justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => dropWeapon(slot)}
                        style={{ background: "#ef4444", padding: "6px 10px", fontSize: "0.85rem" }}
                      >
                        Drop
                      </button>
                    </div>
                  </>
                ) : (
                  <small style={{ color: "var(--muted)" }}>Empty slot</small>
                )}
                {slot !== "tertiary" && <div style={{ borderTop: "1px solid #ccc", margin: "8px 0" }} />}
              </div>
            );
          })}
          {weaponStatus && <small style={{ color: "var(--muted)" }}>{weaponStatus}</small>}
        </div>
        <div className="card stack" style={{ flex: 1, minWidth: 240 }}>
          <h3>Experiences</h3>
          {character.experiences?.length ? (
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>Used</th>
                  <th style={{ textAlign: "center" }}>Name</th>
                  <th style={{ textAlign: "center" }}>Modifier</th>
                </tr>
              </thead>
              <tbody>
                {character.experiences.map((exp, idx) => (
                  <tr key={exp.name}>
                    <td style={{ textAlign: "center" }}>
                      <Checkbox
                        size="small"
                        icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                        checkedIcon={<CheckBoxIcon fontSize="small" />}
                        checked={usedExperiences[idx] ?? false}
                        onChange={() => toggleExperience(idx)}
                        inputProps={{ "aria-label": `Use experience ${exp.name}` }}
                        sx={{
                          color: "var(--muted)",
                          "&.Mui-checked": { color: "#22c55e" }
                        }}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>{exp.name}</td>
                    <td style={{ textAlign: "center" }}>{exp.modifier >= 0 ? `+${exp.modifier}` : exp.modifier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <small style={{ color: "var(--muted)" }}>No experiences listed.</small>
          )}
          <small style={{ color: "var(--muted)" }}>{experienceStatus}</small>
        </div>
        <div className="card stack" style={{ flex: 1, minWidth: 240 }}>
          <h3>Player Notes</h3>
          <textarea
            value={playerNotes}
            onChange={(e) => {
              setPlayerNotes(e.target.value);
              setIsEditingNotes(e.target.value !== lastServerNotes);
            }}
            placeholder="Add your session notes here..."
            rows={10}
          />
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <button type="button" onClick={saveNotes}>
              Save notes
            </button>
            {notesStatus && <small style={{ color: "var(--muted)" }}>{notesStatus}</small>}
          </div>
          <small style={{ color: "var(--muted)" }}>Notes are saved with the campaign state.</small>
        </div>
      </div>
    </div>
  );
}

