import fs from "node:fs";
import path from "node:path";
import type { Item } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");

export function readItems(): Item[] {
  const geoPath = path.join(DATA_DIR, "items.geo.json");
  const jsonPath = path.join(DATA_DIR, "items.json");

  const filePath = fs.existsSync(geoPath)
    ? geoPath
    : fs.existsSync(jsonPath)
    ? jsonPath
    : null;

  if (!filePath) return [];

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  // If GeoJSON FeatureCollection
  if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    return data.features.map((f: any): Item => ({
      id: f.properties.id,
      title: f.properties.title,
      affiliateUrl: f.properties.affiliateUrl,

      category: f.properties.category,
      location: f.properties.location,
      imageUrl: f.properties.imageUrl ?? null,

      lat: f.geometry?.coordinates?.[1] ?? null,
      lng: f.geometry?.coordinates?.[0] ?? null,
    }));
  }

  // Plain array fallback
  if (Array.isArray(data)) {
    return data as Item[];
  }

  return [];
}