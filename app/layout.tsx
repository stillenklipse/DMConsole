import "./globals.css";
import { ReactNode } from "react";
import { Providers } from "./providers";
import { AppShell } from "@/components/AppShell";
import { loadCampaign, loadCharacters } from "@/lib/data";

export const metadata = {
  title: "Digital Dungeon Master",
  description: "Lightweight DM and player console for remote one-shots"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const characters = loadCharacters();
  const campaign = loadCampaign();
  const players = characters.map((c) => ({ name: c.name, key: c.key }));
  const theme = campaign?.theme;
  const pageStyle: Record<string, string> = {};
  if (theme?.backgroundImage) {
    pageStyle["--page-bg-image"] = `url("${theme.backgroundImage}")`;
  }
  if (theme?.backgroundColor) {
    pageStyle["--page-bg-color"] = theme.backgroundColor;
  }

  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="page" style={pageStyle}>
            <AppShell players={players}>{children}</AppShell>
          </div>
        </Providers>
      </body>
    </html>
  );
}

