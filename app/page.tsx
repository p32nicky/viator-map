import HomeClient from "./ui/HomeClient";
import { readItems } from "@/lib/data";

export const runtime = "nodejs";

export default function Page() {
  const items = readItems(); // reads data/items.geo.json if present, else data/items.json
  return <HomeClient items={items} />;
}