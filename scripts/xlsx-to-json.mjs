import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";

const INPUT = path.resolve(process.cwd(), "input/rome.xlsx");
const OUT_DIR = path.resolve(process.cwd(), "data");
const OUT_FILE = path.join(OUT_DIR, "items.json");

if (!fs.existsSync(INPUT)) {
  console.error("ERROR: input/rome.xlsx not found");
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const wb = xlsx.readFile(INPUT);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

function inferCategory(title = "") {
  const t = title.toLowerCase();
  if (t.includes("vatican") || t.includes("st. peter") || t.includes("sistine")) return "Vatican";
  if (t.includes("colosseum") || t.includes("roman forum") || t.includes("palatine")) return "Ancient Rome";
  if (t.includes("food") || t.includes("pasta") || t.includes("wine") || t.includes("tasting") || t.includes("cooking")) return "Food & Drink";
  if (t.includes("day trip") || t.includes("from rome") || t.includes("amalfi") || t.includes("pompeii") || t.includes("tuscany")) return "Day Trips";
  if (t.includes("golf cart") || t.includes("bike") || t.includes("vespa") || t.includes("scooter")) return "By Vehicle";
  if (t.includes("photo") || t.includes("photography") || t.includes("photoshoot")) return "Photography";
  return "Tours";
}

// Keyword -> coords (adds map pins without geocoding)
const LANDMARKS = [
  { key: "colosseum", lat: 41.8902, lng: 12.4922, label: "Colosseum" },
  { key: "roman forum", lat: 41.8925, lng: 12.4853, label: "Roman Forum" },
  { key: "palatine", lat: 41.8899, lng: 12.4883, label: "Palatine Hill" },
  { key: "vatican", lat: 41.9022, lng: 12.4539, label: "Vatican City" },
  { key: "st. peter", lat: 41.9022, lng: 12.4539, label: "St. Peter’s Basilica" },
  { key: "sistine", lat: 41.9065, lng: 12.4536, label: "Sistine Chapel" },
  { key: "trevi", lat: 41.9009, lng: 12.4833, label: "Trevi Fountain" },
  { key: "pantheon", lat: 41.8986, lng: 12.4769, label: "Pantheon" },
  { key: "spanish steps", lat: 41.9059, lng: 12.4823, label: "Spanish Steps" },
  { key: "piazza navona", lat: 41.8992, lng: 12.4731, label: "Piazza Navona" },
  { key: "borghese", lat: 41.9142, lng: 12.4923, label: "Villa Borghese" },
  { key: "trastevere", lat: 41.8897, lng: 12.4707, label: "Trastevere" },
];

function inferLatLng(title = "") {
  const t = title.toLowerCase();
  for (const lm of LANDMARKS) {
    if (t.includes(lm.key)) return { lat: lm.lat, lng: lm.lng, landmark: lm.label };
  }
  return { lat: null, lng: null, landmark: null };
}

const items = rows
  .filter((r) => r.Title && r["Affiliate URL"])
  .map((r, i) => {
    const title = r.Title || "";
    const { lat, lng, landmark } = inferLatLng(title);
    return {
      id: i + 1,
      title,
      imageUrl: r["Image URL"] || "",
      affiliateUrl: r["Affiliate URL"],
      category: inferCategory(title),
      lat,
      lng,
      landmark,
    };
  });

fs.writeFileSync(OUT_FILE, JSON.stringify(items, null, 2));
console.log("SUCCESS: created data/items.json with", items.length, "items");