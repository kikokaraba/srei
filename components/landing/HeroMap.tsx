"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { LeafletMouseEvent, Path, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

// Dynamicky importujeme Leaflet komponenty, aby sa načítali len na klientovi
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: {
      type: string;
      coordinates: unknown;
    };
  }>;
};

// Mock dáta pre kraje
const REGION_DATA: Record<string, { avgPrice: number; avgYield: number; trend: "up" | "down" }> = {
  "Bratislavský kraj": { avgPrice: 3800, avgYield: 3.8, trend: "up" },
  "Trnavský kraj": { avgPrice: 2100, avgYield: 4.9, trend: "up" },
  "Nitriansky kraj": { avgPrice: 1650, avgYield: 5.7, trend: "down" },
  "Trenčiansky kraj": { avgPrice: 1900, avgYield: 5.2, trend: "up" },
  "Žilinský kraj": { avgPrice: 1950, avgYield: 5.1, trend: "up" },
  "Banskobystrický kraj": { avgPrice: 1750, avgYield: 5.4, trend: "up" },
  "Prešovský kraj": { avgPrice: 1650, avgYield: 5.5, trend: "up" },
  "Košický kraj": { avgPrice: 1850, avgYield: 5.3, trend: "down" },
};

// Presné súradnice stredov krajov
const REGION_COORDINATES: Array<{ 
  code: string; 
  name: string; 
  lat: number; 
  lng: number; 
  region: string;
}> = [
  { code: "BA", name: "Bratislava", lat: 48.1485, lng: 17.1077, region: "Bratislavský kraj" },
  { code: "TT", name: "Trnava", lat: 48.3775, lng: 17.5855, region: "Trnavský kraj" },
  { code: "TN", name: "Trenčín", lat: 48.8945, lng: 18.0445, region: "Trenčiansky kraj" },
  { code: "NR", name: "Nitra", lat: 48.3061, lng: 18.0764, region: "Nitriansky kraj" },
  { code: "ZA", name: "Žilina", lat: 49.2231, lng: 18.7398, region: "Žilinský kraj" },
  { code: "BB", name: "Banská Bystrica", lat: 48.7352, lng: 19.1459, region: "Banskobystrický kraj" },
  { code: "PO", name: "Prešov", lat: 48.9981, lng: 21.2339, region: "Prešovský kraj" },
  { code: "KE", name: "Košice", lat: 48.7164, lng: 21.2611, region: "Košický kraj" },
];

// Funkcia pre výpočet farby pulzujúceho bodu podľa výnosu
function getPingColorByYield(yieldValue: number): string {
  if (yieldValue > 5) return "#10b981"; // Emerald pre vysoké výnosy
  if (yieldValue < 4) return "#f43f5e"; // Rose pre nízke výnosy
  return "#fbbf24"; // Zlatá pre stredné výnosy
}

// Funkcia pre výpočet farby podľa výnosu (pre GeoJSON)
function getColorByYield(yieldValue: number): string {
  if (yieldValue >= 5.5) return "#10b981"; // Smaragdová
  if (yieldValue >= 5.0) return "#34d399"; // Svetlejšia smaragdová
  if (yieldValue >= 4.5) return "#fbbf24"; // Zlatá
  if (yieldValue >= 4.0) return "#f59e0b"; // Tmavšia zlatá
  return "#6b7280"; // Šedá pre nízke výnosy
}

// Funkcia pre vytvorenie custom DivIcon markeru
// Musí byť volaná len na klientovi po načítaní Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCustomMarkerIcon(code: string, yieldValue: number, L: any): any {
  const pingColor = getPingColorByYield(yieldValue);
  
  return L.divIcon({
    iconSize: [60, 50],
    iconAnchor: [30, 50],
    popupAnchor: [0, -50],
    className: "custom-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      ">
        <div style="
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 4px;
          padding: 4px 8px;
          color: #f1f5f9;
          font-size: 11px;
          font-weight: 600;
          font-family: system-ui, -apple-system, sans-serif;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        ">
          ${code} ${yieldValue}%
        </div>
        <div style="
          margin-top: 4px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${pingColor};
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          box-shadow: 0 0 0 0 ${pingColor};
        "></div>
      </div>
    `,
  });
}

// React komponent pre popup obsah
function PopupContent({ regionName, data }: { regionName: string; data: { avgPrice: number; avgYield: number; trend: "up" | "down" } }) {
  return (
    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg border border-slate-800 min-w-[200px]">
      <h3 className="font-bold text-lg mb-3 text-emerald-400">{regionName}</h3>
      <div className="mb-2">
        <span className="text-slate-400 text-sm">Priemerný výnos: </span>
        <span className="text-emerald-400 font-semibold text-base">{data.avgYield}%</span>
      </div>
      <div>
        <span className="text-slate-400 text-sm">Cena: </span>
        <span className="text-slate-100 font-semibold text-base" suppressHydrationWarning>
          {data.avgPrice.toLocaleString("sk-SK")} €/m²
        </span>
      </div>
    </div>
  );
}

// Funkcia pre vytvorenie popup obsahu (HTML string pre Leaflet GeoJSON)
function createPopupHTML(regionName: string, data: { avgPrice: number; avgYield: number; trend: "up" | "down" }): string {
  return `
    <div style="
      background: #0f172a;
      color: #f1f5f9;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #1e293b;
      font-family: system-ui, -apple-system, sans-serif;
      min-width: 200px;
    ">
      <h3 style="
        font-weight: 700;
        font-size: 18px;
        margin: 0 0 12px 0;
        color: #10b981;
      ">${regionName}</h3>
      <div style="margin-bottom: 8px;">
        <span style="color: #94a3b8; font-size: 14px;">Priemerný výnos: </span>
        <span style="color: #10b981; font-weight: 600; font-size: 16px;">${data.avgYield}%</span>
      </div>
      <div>
        <span style="color: #94a3b8; font-size: 14px;">Cena: </span>
        <span style="color: #f1f5f9; font-weight: 600; font-size: 16px;">${Math.round(data.avgPrice).toLocaleString("sk-SK")} €/m²</span>
      </div>
    </div>
  `;
}

export function HeroMap() {
  const [geojson, setGeojson] = useState<GeoJSONFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [leafletModule, setLeafletModule] = useState<any>(null);

  // Fix pre Leaflet ikony v Next.js - musí bežať len na klientovi
  useEffect(() => {
    setMounted(true);
    
    // Dynamicky importujeme Leaflet len na klientovi
    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.default.Icon.Default.prototype as any)._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      setLeafletModule(L.default);
    });
  }, []);

  useEffect(() => {
    const fetchGeoJSON = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(
          "https://raw.githubusercontent.com/duhaime/re-atlas/master/data/geojson/slovakia-regions.geojson"
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("GeoJSON loaded successfully:", data);
        setGeojson(data);
        setError(false);
      } catch (err) {
        console.error("Error loading GeoJSON:", err);
        setError(true);
        setGeojson(null);
      } finally {
        setLoading(false);
      }
    };

    if (mounted) {
      fetchGeoJSON();
    }
  }, [mounted]);

  const center: [number, number] = [48.669, 19.699]; // Stred Slovenska

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const style = useCallback((feature?: any): PathOptions => {
    if (!feature || !feature.properties) {
      return {
        fillColor: "#065f46",
        fillOpacity: 0.4,
        color: "#94a3b8",
        weight: 1,
        opacity: 0.3,
      };
    }
    const regionName = (feature.properties.name as string) || (feature.properties.NAME_1 as string) || "";
    const data = REGION_DATA[regionName] || { avgPrice: 0, avgYield: 0, trend: "up" };
    
    return {
      fillColor: getColorByYield(data.avgYield),
      fillOpacity: 0.4,
      color: "#94a3b8",
      weight: 1,
      opacity: 0.3,
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onEachFeature = useCallback((feature: any, layer: Path) => {
    if (!feature || !feature.properties || !layer) return;
    const regionName = (feature.properties.name as string) || (feature.properties.NAME_1 as string) || "";
    const data = REGION_DATA[regionName] || { avgPrice: 0, avgYield: 0, trend: "up" };

    // Hover effect
    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        const pathLayer = e.target as Path;
        pathLayer.setStyle({
          fillOpacity: 0.8,
          weight: 2,
          opacity: 0.6,
        });
      },
      mouseout: (e: LeafletMouseEvent) => {
        const pathLayer = e.target as Path;
        pathLayer.setStyle({
          fillOpacity: 0.4,
          weight: 1,
          opacity: 0.3,
        });
      },
    });

    // Custom popup
    const popupContent = createPopupHTML(regionName, data);
    layer.bindPopup(popupContent, {
      className: "custom-popup",
    });
  }, []);

  return (
    <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-100 mb-4">
            Investičné príležitosti
            <span className="block text-emerald-400">naprieč Slovenskom</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Interaktívna mapa zobrazujúca investičnú atraktivitu a výnosy v
            slovenských krajoch
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden" style={{ height: "600px" }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-50 bg-slate-900/80">
                <div className="text-slate-400">Načítavam mapu...</div>
              </div>
            )}
            
            {mounted && (
            <MapContainer
              center={center}
              zoom={8}
              scrollWheelZoom={false}
              attributionControl={false}
              style={{ height: "100%", width: "100%", zIndex: 1 }}
              className="rounded-2xl"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
              />

              {geojson && !error && geojson.features && geojson.features.length > 0 ? (
                <GeoJSON
                  data={geojson}
                  style={style}
                  onEachFeature={onEachFeature}
                />
              ) : null}

              {/* Custom DivIcon markery pre kraje */}
              {leafletModule && REGION_COORDINATES.map((region) => {
                const data = REGION_DATA[region.region] || { avgPrice: 0, avgYield: 0, trend: "up" };
                const icon = createCustomMarkerIcon(region.code, data.avgYield, leafletModule);
                
                return (
                  <Marker
                    key={region.code}
                    position={[region.lat, region.lng]}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    icon={icon as any}
                    eventHandlers={{
                      click: () => {
                        // Plynulý posun na sekciu 'Funkcie'
                        const featuresSection = document.getElementById("features");
                        if (featuresSection) {
                          featuresSection.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      },
                    }}
                  >
                    <Popup>
                      <PopupContent regionName={region.region} data={data} />
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
