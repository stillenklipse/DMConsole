import "./globals.css";
import { ReactNode } from "react";
import { Providers } from "./providers";
import { AppShell } from "@/components/AppShell";
import { loadCharacters } from "@/lib/data";

export const metadata = {
  title: "Digital Dungeon Master",
  description: "Lightweight DM and player console for remote one-shots"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const characters = loadCharacters();
  const players = characters.map((c) => ({ name: c.name, key: c.key }));

  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="page">
            <AppShell players={players}>{children}</AppShell>
          </div>
        </Providers>
      </body>
    </html>
  );
}

