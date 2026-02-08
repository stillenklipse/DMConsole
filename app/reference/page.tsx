import { loadCampaign } from "@/lib/data";
import { CampaignReference } from "@/components/CampaignReference";

export default function ReferencePage() {
  const campaign = loadCampaign();

  return (
    <div className="stack">
      <h1>Campaign reference</h1>
      <CampaignReference campaign={campaign} />
    </div>
  );
}

