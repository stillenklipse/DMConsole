import { loadCampaign, loadCharacters } from "@/lib/data";
import { DMConsole } from "@/components/DMConsole";

export default function DMPage() {
  const characters = loadCharacters();
  const campaign = loadCampaign();

  return (
    <div className="stack">
      <h1>DM Console</h1>
      <DMConsole characters={characters} campaign={campaign} />
    </div>
  );
}

