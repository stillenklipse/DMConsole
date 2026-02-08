import Link from "next/link";
import Button from "@mui/material/Button";
import { loadCharacters } from "@/lib/data";

export default async function HomePage() {
  const characters = loadCharacters();
  const cards = [
    {
      key: "dm",
      title: "DM Console",
      text: "View campaign, incoming rolls/stat edits, and approve or override.",
      href: "/dm",
      image: "/DMConole.png"
    },
    {
      key: "reference",
      title: "Reference",
      text: "Maps, enemies, important notes, and recap log.",
      href: "/reference",
      image: "/reference.png"
    },
    ...characters.map((c) => ({
      key: c.key,
      title: c.name,
      text: c.notes ?? "Open this character’s dashboard.",
      href: `/p/${encodeURIComponent(c.key)}`,
      image: `/${c.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9_-]/g, "")}.png`
    }))
  ];

  return (
    <div className="stack">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          alignItems: "stretch"
        }}
      >
        {cards.map((card) => (
          <div key={card.key} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3>{card.title}</h3>
            {card.image && (
              <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                <img
                  src={card.image}
                  alt={card.title}
                  style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 10 }}
                />
              </div>
            )}
            <p style={{ flex: 1 }}>{card.text}</p>
            <Link href={card.href}>
              <Button variant="outlined" size="small" fullWidth>
                View
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

