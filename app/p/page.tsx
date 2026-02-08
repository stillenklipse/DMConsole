"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PlayerLoginPage() {
  const [key, setKey] = useState("");
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    router.push(`/p/${encodeURIComponent(key.trim())}`);
  };

  return (
    <div className="stack">
      <h1>Player access</h1>
      <form className="card stack" onSubmit={submit}>
        <label>Player key</label>
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="example: ash" />
        <button type="submit">Open character</button>
      </form>
    </div>
  );
}

