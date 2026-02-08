"use client";

import { useEffect, useState } from "react";

type Props = {
  label: string;
  storageKey: string;
  onKey: (key: string) => void;
  placeholder?: string;
};

export function KeyGate({ label, storageKey, onKey, placeholder = "enter key" }: Props) {
  const [key, setKey] = useState("");

  useEffect(() => {
    const cached = window.localStorage.getItem(storageKey);
    if (cached) {
      setKey(cached);
      onKey(cached);
    }
  }, [onKey, storageKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    window.localStorage.setItem(storageKey, trimmed);
    onKey(trimmed);
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label>{label}</label>
      <input value={key} onChange={(e) => setKey(e.target.value)} placeholder={placeholder} />
      <button type="submit">Continue</button>
    </form>
  );
}

