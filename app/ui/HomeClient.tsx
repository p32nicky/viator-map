"use client";

import { useState } from "react";
import MapView from "./MapView";
import SidebarList from "./SidebarList";
import DetailDrawer from "./DetailDrawer";

export type Item = {
  id: string;
  title: string;
  imageUrl?: string | null;
  affiliateUrl: string;
  lat?: number | null;
  lng?: number | null;
  location?: string;
};

export default function HomeClient({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<Item | null>(null);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%" }}>
      <SidebarList
        items={items}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />

      <MapView
        items={items}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />

      <DetailDrawer item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}