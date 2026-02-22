"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import SidebarList from "./SidebarList";
import MapView from "./MapView";
import DetailDrawer from "./DetailDrawer";

type Item = {
  id: string | number;
  title: string;
  imageUrl: string;
  affiliateUrl: string;
  category: string;
  lat?: number | null;
  lng?: number | null;
  landmark?: string | null;
};

function hasCoords(it: Item) {
  return typeof it.lat === "number" && typeof it.lng === "number";
}

function openLink(url: string) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function HomeClient({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);

  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: ["title", "category", "landmark"],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return items;
    return fuse.search(q).map((r) => r.item);
  }, [items, fuse, query]);

  // Only pins go to the map
  const mapItems = useMemo(() => filtered.filter(hasCoords), [filtered]);

  const counts = useMemo(() => {
    const total = filtered.length;
    const onMap = mapItems.length;
    const noPin = total - onMap;
    return { total, onMap, noPin };
  }, [filtered, mapItems]);

  const onSelect = (it: Item) => {
    setSelected(it);
    // Always open the link (even if there's no map pin)
    openLink(it.affiliateUrl);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "390px 1fr", height: "100vh" }}>
      <SidebarList
        items={filtered}
        selectedId={selected?.id ?? null}
        query={query}
        onQueryChange={setQuery}
        onSelect={onSelect}
        counts={counts}
      />

      <div style={{ position: "relative" }}>
        <MapView items={mapItems} selectedId={selected?.id ?? null} onSelect={onSelect} />
        <DetailDrawer item={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}