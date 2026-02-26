"use client";

import { useState } from "react";
import SidebarList from "@/app/ui/SidebarList";
import MapView from "@/app/ui/MapView";
import DetailDrawer from "@/app/ui/DetailDrawer";
import type { Item } from "@/lib/types";

export default function HomeClient({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<Item | null>(null);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
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

      <DetailDrawer
        item={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}