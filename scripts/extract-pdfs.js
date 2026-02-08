const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

async function extract() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    throw new Error(`Missing data directory at ${dataDir}`);
  }

  const pdfs = fs.readdirSync(dataDir).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (pdfs.length === 0) {
    console.log("No PDFs found in data/");
    return;
  }

  const limit = Number(process.env.PDF_EXTRACT_LIMIT ?? 4000);
  const results = [];
  for (const file of pdfs) {
    const buffer = fs.readFileSync(path.join(dataDir, file));
    const parsed = await pdfParse(buffer);
    results.push({
      file,
      info: parsed.info ?? {},
      meta: parsed.metadata?.metadata ?? {},
      text: parsed.text.slice(0, limit) // clip to keep file small; adjust as needed
    });
    console.log(`Parsed ${file} (${parsed.text.length} chars)`);
  }

  const outPath = path.join(dataDir, "pdf-extract.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} entries to ${outPath}`);
}

extract().catch((err) => {
  console.error("Failed to extract PDFs:", err);
  process.exit(1);
});

