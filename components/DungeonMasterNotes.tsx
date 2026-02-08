"use client";

import { useEffect, useState } from "react";

type Note = { id: string; author: string; text: string; createdAt: number; shared?: boolean };

export function DungeonMasterNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [shareDraft, setShareDraft] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotes = async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setNotes(data.referenceNotes ?? []);
  };

  useEffect(() => {
    loadNotes();
    const interval = setInterval(loadNotes, 4000);
    return () => clearInterval(interval);
  }, []);

  const addNote = async () => {
    const text = draft.trim();
    if (!text) return;
    setLoading(true);
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note", note: text, playerKey: "Dungeon Master", shared: shareDraft })
    });
    if (res.ok) {
      const data = await res.json();
      setNotes((prev) => [data.note, ...prev]);
      setDraft("");
      setShareDraft(false);
    }
    setLoading(false);
  };

  const toggleShare = async (noteId: string, nextShared: boolean) => {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, shared: nextShared } : n)));
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note-share", noteId, shared: nextShared })
    });
    if (!res.ok) {
      // revert on failure
      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, shared: !nextShared } : n)));
    }
  };

  return (
    <div className="stack">
      <h2>Dungeon Master Notes</h2>
      <div className="stack">
        <label>Add note</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Private note (share toggle below)"
          disabled={loading}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={shareDraft}
            onChange={(e) => setShareDraft(e.target.checked)}
            disabled={loading}
            style={{ width: 20, height: 20 }}
          />
          Share with group
        </label>
        <button type="button" onClick={addNote} disabled={loading}>
          Add note
        </button>
      </div>

      <div className="stack">
        {notes.length === 0 && <small style={{ color: "var(--muted)" }}>No notes yet.</small>}
        {notes.map((n) => (
          <div key={n.id} className="card" style={{ padding: 8 }}>
            <div className="row" style={{ alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={Boolean(n.shared)}
                onChange={(e) => toggleShare(n.id, e.target.checked)}
                style={{ width: 20, height: 20 }}
              />
              <div style={{ flex: 1 }}>{n.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

