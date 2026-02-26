"use client";
import type { Item } from "@/lib/types";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

import { useEffect, useMemo, useRef } from "react";


function hasCoords(it: Item) {
  return typeof it.lat === "number" && typeof it.lng === "number";
}

// Default marker
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Selected marker (red)
const SelectedIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openLink(url: string) {
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "nofollow sponsored noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function FlyToSelected({
  pins,
  selectedId,
}: {
  pins: Item[];
  selectedId: Item["id"] | null;
}) {
  const map = useMap();

  const selected = useMemo(() => {
    if (selectedId === null) return null;
    return pins.find((i) => String(i.id) === String(selectedId)) ?? null;
  }, [pins, selectedId]);

  useEffect(() => {
    if (!selected) return;
    if (!hasCoords(selected)) return;
    map.flyTo([selected.lat as number, selected.lng as number], Math.max(map.getZoom(), 14), {
      duration: 0.6,
    });
  }, [map, selected]);

  return null;
}

function ClusteredMarkers({
  pins,
  onSelect,
  selectedId,
}: {
  pins: Item[];
  onSelect: (item: Item) => void;
  selectedId: Item["id"] | null;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerById = useRef<Map<string, L.Marker>>(new Map());

  // Build clusters when pins change
  useEffect(() => {
    if (!map) return;

    // Cleanup previous cluster group
    if (clusterRef.current) {
      clusterRef.current.clearLayers();
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
      markerById.current.clear();
    }

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 17,
    });

    for (const it of pins) {
      // pins already filtered by coords, but we’ll still be defensive
      if (!hasCoords(it)) continue;

      const id = String(it.id);

      const marker = L.marker([it.lat as number, it.lng as number], {
        icon: selectedId !== null && id === String(selectedId) ? SelectedIcon : DefaultIcon,
        zIndexOffset: selectedId !== null && id === String(selectedId) ? 1000 : 0,
      });

      marker.on("click", () => {
        onSelect(it);
        openLink(it.affiliateUrl);
      });

      marker.bindPopup(`
        <div style="font-weight:700;font-size:13px;">${escapeHtml(it.title)}</div>
        <div style="font-size:12px;opacity:.75;margin-top:4px;">
          ${escapeHtml(it.category ?? "Tour")}${"landmark" in it && (it as any).landmark ? " • " + escapeHtml((it as any).landmark) : ""}
        </div>
        <div style="font-size:12px;margin-top:8px;">(Click marker to open link)</div>
      `);

      markerById.current.set(id, marker);
      cluster.addLayer(marker);
    }

    clusterRef.current = cluster;
    map.addLayer(cluster);

    return () => {
      cluster.clearLayers();
      map.removeLayer(cluster);
      clusterRef.current = null;
      markerById.current.clear();
    };
  }, [map, pins, onSelect, selectedId]);

  // Update selected marker icon without rebuilding everything
  useEffect(() => {
    const sel = selectedId !== null ? String(selectedId) : null;

    for (const [id, marker] of markerById.current.entries()) {
      const isSel = sel !== null && id === sel;
      marker.setIcon(isSel ? SelectedIcon : DefaultIcon);
      marker.setZIndexOffset(isSel ? 1000 : 0);

      if (isSel) {
        // Ensure selected marker is visible even if it's inside a cluster
        // @ts-ignore markercluster adds zoomToShowLayer
        clusterRef.current?.zoomToShowLayer(marker, () => {
          try {
            marker.openPopup();
          } catch {}
        });
      }
    }
  }, [selectedId]);

  return null;
}

export default function MapView({
  items,
  onSelect,
  selectedId,
}: {
  items: Item[];
  onSelect: (item: Item) => void;
  selectedId: Item["id"] | null;
}) {
  // Only use items with real coords
  const pins = useMemo(() => items.filter(hasCoords), [items]);

  // Rome center
  const center: [number, number] = [41.9028, 12.4964];

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToSelected pins={pins} selectedId={selectedId} />
      <ClusteredMarkers pins={pins} onSelect={onSelect} selectedId={selectedId} />
    </MapContainer>
  );
}