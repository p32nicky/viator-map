"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import dynamic from "next/dynamic";

import SidebarList from "@/app/ui/SidebarList";
import DetailDrawer from "@/app/ui/DetailDrawer";
import type { Item } from "@/lib/types";

const MapView = dynamic(() => import("@/app/ui/MapView"), { ssr: false });

export default function HomeClient({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<Item | null>(null);
  const [query, setQuery] = useState("");

  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: ["title", "category", "location"],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = query.trim();
    if (!q) return items;
    return fuse.search(q).map((r) => r.item);
  }, [items, fuse, query]);

  const mapItems = useMemo(() => {
    return items.filter((it) => it.lat != null && it.lng != null);
  }, [items]);

  const onSelect = (it: Item) => {
    setSelected(it);
    if (it.lat == null || it.lng == null) {
      // only runs in browser due to click
      if (it.affiliateUrl) window.open(it.affiliateUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden" }}>
      <SidebarList items={filteredItems} selectedId={selected?.id ?? null} onSelect={onSelect} />
      <MapView items={mapItems} selectedId={selected?.id ?? null} onSelect={onSelect} />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} />

      <a
        href="/disclosure"
        style={{
          position: "fixed",
          right: 10,
          bottom: 10,
          fontSize: 12,
          opacity: 0.75,
          background: "rgba(255,255,255,0.9)",
          padding: "6px 10px",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.12)",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        Affiliate disclosure
      </a>
    </div>
  );
}