"use client";

import { useEffect, useState } from "react";
import { StatBlock } from "@/types";

type Props = {
  characterId: string;
  playerKey: string;
  initialStats: StatBlock;
};

export function StatEditor({ characterId, playerKey, initialStats }: Props) {
  const [stats, setStats] = useState<StatBlock>(initialStats);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  const handleChange = (field: keyof StatBlock, value: number | string) => {
    setStats((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomChange = (label: string, value: number) => {
    setStats((prev) => ({
      ...prev,
      custom: { ...(prev.custom ?? {}), [label]: value }
    }));
  };

  const submit = async () => {
    setStatus("Updating...");
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerKey, characterId, stats, type: "stat-update" })
    });
    if (!res.ok) {
      setStatus("Failed to update");
      return;
    }
    setStatus("Updated");
  };

  return (
    <div className="card stack">
      <div className="row">
        <div style={{ flex: 1, minWidth: 140 }}>
          <label>HP</label>
          <input
            type="number"
            value={stats.hp}
            onChange={(e) => handleChange("hp", Number(e.target.value))}
          />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label>Damage</label>
          <input
            type="number"
            value={stats.damage}
            onChange={(e) => handleChange("damage", Number(e.target.value))}
          />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label>Focus</label>
          <input
            type="number"
            value={stats.focus ?? 0}
            onChange={(e) => handleChange("focus", Number(e.target.value))}
          />
        </div>
      </div>
      <label>Custom modifiers</label>
      <div className="stack">
        {Object.entries(stats.custom ?? {}).map(([label, value]) => (
          <div className="row" key={label}>
            <input
              style={{ maxWidth: 180 }}
              value={label}
              onChange={(e) => {
                const newLabel = e.target.value;
                setStats((prev) => {
                  const updated = { ...(prev.custom ?? {}) };
                  delete updated[label];
                  updated[newLabel] = value;
                  return { ...prev, custom: updated };
                });
              }}
            />
            <input
              type="number"
              style={{ maxWidth: 120 }}
              value={value}
              onChange={(e) => handleCustomChange(label, Number(e.target.value))}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => handleCustomChange(`mod-${Date.now().toString().slice(-4)}`, 0)}
        >
          + Add modifier
        </button>
      </div>
      <label>Notes</label>
      <textarea value={stats.notes ?? ""} onChange={(e) => handleChange("notes", e.target.value)} />
      <button type="button" onClick={submit}>
        Submit update (DM approval)
      </button>
      <small style={{ color: "var(--muted)" }}>{status}</small>
    </div>
  );
}

