"use client";

import { useMemo, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";

type Props = {
  playerKey: string;
  characterId: string;
  characterName?: string;
  traits?: Record<string, number>;
};

export function DiceRoller({ playerKey, characterId, characterName, traits = {} }: Props) {
  const [selectedTrait, setSelectedTrait] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [hopeRoll, setHopeRoll] = useState<number | null>(null);
  const [fearRoll, setFearRoll] = useState<number | null>(null);
  const [actionDie, setActionDie] = useState<string>("d20");
  const [actionResult, setActionResult] = useState<string>("");
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");

  const traitEntries = useMemo(
    () => Object.entries(traits).map(([label, value]) => ({ label, value })),
    [traits]
  );

  const roll = () => {
    const hope = Math.floor(Math.random() * 12) + 1;
    const fear = Math.floor(Math.random() * 12) + 1;
    setHopeRoll(hope);
    setFearRoll(fear);

    const modValue =
      selectedTrait && traits[selectedTrait] !== undefined ? Number(traits[selectedTrait]) : 0;
    const total = hope + fear + modValue;
    const critical = hope === fear;
    sendRoll(hope, fear, modValue, total, critical);
  };

  const rollActionDie = async () => {
    const sides = Number(actionDie.replace("d", "")) || 20;
    const rollVal = Math.floor(Math.random() * sides) + 1;
    const res = await fetch("/api/roll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerKey,
        characterId,
        die: actionDie,
        result: rollVal,
        total: rollVal,
        payload: { actionDie }
      })
    });
    if (!res.ok) {
      setActionResult("Failed to send roll to DM");
      return;
    }
    const msg = `${characterName ?? "Player"} — Rolled ${actionDie} = ${rollVal}`;
    setActionResult(msg);
    setSnackMessage(msg);
    setSnackOpen(true);
  };

  const sendRoll = async (
    hope: number,
    fear: number,
    modifier: number,
    total: number,
    critical: boolean
  ) => {
    const modifierLabel = selectedTrait || "none";
    const res = await fetch("/api/roll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerKey,
        characterId,
        die: "2d12",
        result: hope + fear,
        total,
        modifiers: [{ label: modifierLabel, value: modifier }],
        payload: {
          hopeRoll: hope,
          fearRoll: fear,
          modifier,
          modifierLabel,
          critical
        },
        note: `Hope ${hope}, Fear ${fear}, Mod ${modifierLabel} ${modifier >= 0 ? "+" : ""}${modifier}${
          critical ? " • CRITICAL (doubles)" : ""
        }`
      })
    });
    if (!res.ok) {
      setResult("Failed to send roll to DM");
      return;
    }
    const msg = `Hope ${hope} + Fear ${fear} + ${modifierLabel || "mod"} ${
      modifier >= 0 ? "+" : ""
    }${modifier} = ${total}${critical ? " • CRITICAL" : ""}`;
    const fullMsg = `${characterName ?? "Player"} — ${msg}`;
    setResult(fullMsg);
    setSnackMessage(fullMsg);
    setSnackOpen(true);
  };

  return (
    <div className="stack">
      <h3>Duality Dice</h3>
      <select value={selectedTrait} onChange={(e) => setSelectedTrait(e.target.value)}>
        <option value="">No modifier</option>
        {traitEntries.map((t) => (
          <option key={t.label} value={t.label}>
            {t.label} {t.value >= 0 ? `(+${t.value})` : `(${t.value})`}
          </option>
        ))}
      </select>
      <button type="button" onClick={roll}>
        Roll Duality Dice
      </button>
      <div className="row" style={{ gap: 12, justifyContent: "center" }}>
        <div className="card" style={{ padding: 8, minWidth: 120, textAlign: "center" }}>
          <strong>Hope Score</strong>
          <div>{hopeRoll ?? "—"}</div>
        </div>
        <div className="card" style={{ padding: 8, minWidth: 120, textAlign: "center" }}>
          <strong>Fear Score</strong>
          <div>{fearRoll ?? "—"}</div>
        </div>
      </div>
      <small style={{ color: "var(--muted)" }}>{result}</small>

      <div style={{ borderTop: "1px solid var(--border)", margin: "10px 0" }} />

      <div className="stack" style={{ gap: 8 }}>
        <h3 style={{ margin: 0 }}>Action Dice</h3>
        <select value={actionDie} onChange={(e) => setActionDie(e.target.value)}>
          {["d4", "d6", "d8", "d10", "d12", "d20"].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button type="button" onClick={rollActionDie}>
          Roll Action Dice
        </button>
        <small style={{ color: "var(--muted)" }}>{actionResult}</small>
      </div>

      <Snackbar
        open={snackOpen}
        onClose={() => setSnackOpen(false)}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity="info"
          variant="filled"
          sx={{ width: "100%" }}
          action={
            <Button color="inherit" size="small" onClick={() => setSnackOpen(false)}>
              Dismiss
            </Button>
          }
        >
          {snackMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}

