"use client";

import { useEffect, useState } from "react";
import { Campaign } from "@/types";

type Props = {
  campaign: Campaign;
};

export function CampaignReference({ campaign }: Props) {
  const [referenceNotes, setReferenceNotes] = useState<
    { id: string; author: string; text: string; createdAt: number; shared?: boolean }[]
  >([]);
  const [sharedImages, setSharedImages] = useState<{ title: string; url: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setReferenceNotes(data.referenceNotes ?? []);
      setSharedImages(data.sharedReferenceImages ?? []);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="stack">
      <div className="card stack">
        <h2>{campaign.title}</h2>
        {campaign.summary && <p>{campaign.summary}</p>}
      </div>
      {sharedImages.length ? (
        <div className="stack">
          {sharedImages.map((img) => (
            <div className="card" key={img.url} style={{ padding: 8 }}>
              <img
                src={img.url}
                alt={img.title}
                style={{ width: "100%", maxWidth: 960, borderRadius: 8, display: "block", margin: "0 auto" }}
              />
              <small>{img.title}</small>
            </div>
          ))}
        </div>
      ) : (
        <small style={{ color: "var(--muted)" }}>No reference images yet.</small>
      )}
      {/* NPCs/Enemies hidden on reference page per request */}
      <div className="card stack">
        <h3>Dungeon Master Notes</h3>
        {referenceNotes.filter((n) => n.shared).length === 0 && (
          <small style={{ color: "var(--muted)" }}>No shared notes yet.</small>
        )}
        {referenceNotes
          .filter((n) => n.shared)
          .map((n) => (
            <div key={n.id} className="stack" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
              <strong>Dungeon Master</strong>
              <small>{n.text}</small>
              <small style={{ color: "var(--muted)" }}>{new Date(n.createdAt).toLocaleString()}</small>
            </div>
          ))}
      </div>
    </div>
  );
}

