import { notFound } from "next/navigation";
import { loadCharacters } from "@/lib/data";
import { getState } from "@/lib/state";
import { PlayerDashboard } from "@/components/PlayerDashboard";

export default function PlayerPage({ params }: { params: { key: string } }) {
  const characters = loadCharacters();
  const character = characters.find((c) => c.key.toLowerCase() === params.key.toLowerCase());
  const currentStats = character ? getState().stats[character.id] ?? character.stats : undefined;

  if (!character) return notFound();

  return (
    <div className="stack">
      <PlayerDashboard playerKey={params.key} character={character} initialStats={currentStats ?? character.stats} />
    </div>
  );
}

