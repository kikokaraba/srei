"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import Supercluster from "supercluster";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  MapPin,
  Building2,
  Flame,
  SlidersHorizontal,
  RotateCcw,
  Loader2,
  TrendingUp,
  Euro,
  Home,
  Layers,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  X,
} from "lucide-react";

// Types
interface Property {
  id: string;
  title: string;
  price: number;
  price_per_m2: number;
  area_m2: number;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  condition: string;
  listing_type: string;
  is_distressed: boolean;
  source_url: string | null;
  rooms: number | null;
  source: string;
}

interface CityData {
  name: string;
  slug: string;
  lat: number;
  lng: number;
  avgPrice: number;
  avgYield: number;
  properties: number;
  hotDeals: number;
}

interface MapFilters {
  listingType: "ALL" | "PREDAJ" | "PRENAJOM";
  priceMin: number | null;
  priceMax: number | null;
  hotDealsOnly: boolean;
}

type ViewMode = "clusters" | "heatmap" | "properties";
type HeatmapMetric = "price" | "yield" | "count";

// City data
const CITIES_DATA: CityData[] = [
  { name: "Bratislava", slug: "BRATISLAVA", lat: 48.1486, lng: 17.1077, avgPrice: 3200, avgYield: 4.2, properties: 0, hotDeals: 0 },
  { name: "Košice", slug: "KOSICE", lat: 48.7164, lng: 21.2611, avgPrice: 1850, avgYield: 5.8, properties: 0, hotDeals: 0 },
  { name: "Prešov", slug: "PRESOV", lat: 48.9986, lng: 21.2391, avgPrice: 1650, avgYield: 5.5, properties: 0, hotDeals: 0 },
  { name: "Žilina", slug: "ZILINA", lat: 49.2231, lng: 18.7394, avgPrice: 1950, avgYield: 5.1, properties: 0, hotDeals: 0 },
  { name: "Banská Bystrica", slug: "BANSKA_BYSTRICA", lat: 48.7364, lng: 19.1458, avgPrice: 1750, avgYield: 5.4, properties: 0, hotDeals: 0 },
  { name: "Trnava", slug: "TRNAVA", lat: 48.3774, lng: 17.5883, avgPrice: 2100, avgYield: 4.9, properties: 0, hotDeals: 0 },
  { name: "Trenčín", slug: "TRENCIN", lat: 48.8945, lng: 18.0444, avgPrice: 1900, avgYield: 5.2, properties: 0, hotDeals: 0 },
  { name: "Nitra", slug: "NITRA", lat: 48.3061, lng: 18.0833, avgPrice: 1650, avgYield: 5.7, properties: 0, hotDeals: 0 },
];

// Mapbox token (use environment variable)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function MapboxPropertyMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [cities, setCities] = useState<CityData[]>(CITIES_DATA);
  const [viewMode, setViewMode] = useState<ViewMode>("clusters");
  const [metric, setMetric] = useState<HeatmapMetric>("count");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const [filters, setFilters] = useState<MapFilters>({
    listingType: "ALL",
    priceMin: null,
    priceMax: null,
    hotDealsOnly: false,
  });
  
  // Filter properties
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      if (!p.latitude || !p.longitude) return false;
      if (filters.listingType !== "ALL" && p.listing_type !== filters.listingType) return false;
      if (filters.priceMin && p.price < filters.priceMin) return false;
      if (filters.priceMax && p.price > filters.priceMax) return false;
      if (filters.hotDealsOnly && !p.is_distressed) return false;
      return true;
    });
  }, [properties, filters]);
  
  // Convert to GeoJSON
  const geojsonData = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: filteredProperties.map(p => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [p.longitude!, p.latitude!],
        },
        properties: {
          id: p.id,
          title: p.title,
          price: p.price,
          price_per_m2: p.price_per_m2,
          area_m2: p.area_m2,
          city: p.city,
          district: p.district,
          listing_type: p.listing_type,
          is_distressed: p.is_distressed,
          source_url: p.source_url,
          rooms: p.rooms,
        },
      })),
    };
  }, [filteredProperties]);
  
  // Stats
  const stats = useMemo(() => {
    const total = filteredProperties.length;
    const hotDeals = filteredProperties.filter(p => p.is_distressed).length;
    const avgPrice = total > 0 
      ? Math.round(filteredProperties.reduce((sum, p) => sum + p.price_per_m2, 0) / total)
      : 0;
    return { total, hotDeals, avgPrice };
  }, [filteredProperties]);
  
  // Fetch properties
  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/properties/map?limit=2000&hasCoordinates=true");
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      setProperties(data.properties || []);
      
      // Update city stats
      const cityStats: Record<string, { count: number; totalPrice: number; hotDeals: number }> = {};
      for (const p of data.properties || []) {
        if (!cityStats[p.city]) cityStats[p.city] = { count: 0, totalPrice: 0, hotDeals: 0 };
        cityStats[p.city].count++;
        cityStats[p.city].totalPrice += p.price_per_m2;
        if (p.is_distressed) cityStats[p.city].hotDeals++;
      }
      
      setCities(prev => prev.map(city => {
        const s = cityStats[city.slug];
        return s ? { ...city, properties: s.count, hotDeals: s.hotDeals, avgPrice: Math.round(s.totalPrice / s.count) } : city;
      }));
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!MAPBOX_TOKEN) {
      console.warn("Mapbox token not set");
      setLoading(false);
      return;
    }
    
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [19.5, 48.7], // Center of Slovakia
      zoom: 7,
      minZoom: 6,
      maxZoom: 18,
    });
    
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    
    map.current.on("load", () => {
      setMapLoaded(true);
      
      // Add empty source for properties
      map.current!.addSource("properties", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
      
      // Cluster circles
      map.current!.addLayer({
        id: "clusters",
        type: "circle",
        source: "properties",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#3b82f6", // blue for small clusters
            10, "#8b5cf6", // purple for medium
            50, "#ef4444", // red for large
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            20,
            10, 30,
            50, 40,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-opacity": 0.8,
        },
      });
      
      // Cluster count labels
      map.current!.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "properties",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 14,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });
      
      // Individual points
      map.current!.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "properties",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            ["get", "is_distressed"], "#ef4444", // red for hot deals
            ["==", ["get", "listing_type"], "PRENAJOM"], "#8b5cf6", // purple for rent
            "#3b82f6", // blue for sale
          ],
          "circle-radius": [
            "case",
            ["get", "is_distressed"], 10,
            7,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });
      
      // Click on cluster to zoom in
      map.current!.on("click", "clusters", (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0].properties?.cluster_id;
        const source = map.current!.getSource("properties") as mapboxgl.GeoJSONSource;
        
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          
          map.current!.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom!,
          });
        });
      });
      
      // Click on point to show popup
      map.current!.on("click", "unclustered-point", (e) => {
        if (!e.features || e.features.length === 0) return;
        
        const feature = e.features[0];
        const props = feature.properties!;
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        
        // Find the full property data
        const property = properties.find(p => p.id === props.id);
        if (property) setSelectedProperty(property);
        
        // Create popup content
        const isHotDeal = props.is_distressed;
        const isRent = props.listing_type === "PRENAJOM";
        
        const html = `
          <div class="p-3 min-w-[250px]">
            <div class="flex items-start justify-between gap-2 mb-2">
              <h3 class="font-semibold text-sm text-slate-100 line-clamp-2">${props.title}</h3>
              ${isHotDeal ? '<span class="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full whitespace-nowrap">Hot Deal</span>' : ''}
            </div>
            <div class="text-xs text-slate-400 mb-3">${props.district}, ${props.city}</div>
            <div class="flex items-center justify-between border-t border-slate-700 pt-2">
              <div>
                <div class="text-lg font-bold text-white">${Number(props.price).toLocaleString("sk-SK")} €</div>
                <div class="text-xs text-slate-400">${Number(props.price_per_m2).toLocaleString("sk-SK")} €/m²</div>
              </div>
              <div class="text-right">
                <div class="font-medium text-slate-300">${props.area_m2} m²</div>
                ${props.rooms ? `<div class="text-xs text-slate-400">${props.rooms} izby</div>` : ''}
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-slate-700">
              <span class="px-2 py-1 rounded text-xs ${isRent ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}">
                ${isRent ? 'Prenájom' : 'Predaj'}
              </span>
              ${props.source_url ? `<a href="${props.source_url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 text-xs">Detail →</a>` : ''}
            </div>
          </div>
        `;
        
        popup.current = new mapboxgl.Popup({ closeButton: true, maxWidth: "300px" })
          .setLngLat(coordinates)
          .setHTML(html)
          .addTo(map.current!);
      });
      
      // Change cursor on hover
      map.current!.on("mouseenter", "clusters", () => {
        map.current!.getCanvas().style.cursor = "pointer";
      });
      map.current!.on("mouseleave", "clusters", () => {
        map.current!.getCanvas().style.cursor = "";
      });
      map.current!.on("mouseenter", "unclustered-point", () => {
        map.current!.getCanvas().style.cursor = "pointer";
      });
      map.current!.on("mouseleave", "unclustered-point", () => {
        map.current!.getCanvas().style.cursor = "";
      });
    });
    
    fetchProperties();
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [fetchProperties]);
  
  // Update map data when properties change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    const source = map.current.getSource("properties") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geojsonData);
    }
  }, [geojsonData, mapLoaded]);
  
  // Fly to city
  const flyToCity = (city: CityData) => {
    if (map.current) {
      map.current.flyTo({
        center: [city.lng, city.lat],
        zoom: 12,
        duration: 1500,
      });
    }
  };
  
  // Reset view
  const resetView = () => {
    if (map.current) {
      map.current.flyTo({
        center: [19.5, 48.7],
        zoom: 7,
        duration: 1000,
      });
    }
    setSelectedProperty(null);
  };
  
  const formatCurrency = (value: number) => value.toLocaleString("sk-SK") + " €";
  
  // If no token, show message
  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 text-white p-8">
        <MapPin className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Mapbox token nie je nastavený</h2>
        <p className="text-slate-400 text-center max-w-md mb-4">
          Pre zobrazenie mapy je potrebné nastaviť NEXT_PUBLIC_MAPBOX_TOKEN v environment variables.
        </p>
        <a 
          href="https://account.mapbox.com/access-tokens/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-2"
        >
          Získať Mapbox token
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex-none bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 p-4 z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title and stats */}
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              Mapa nehnuteľností
            </h1>
            
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="w-4 h-4" />
                <span className="text-white font-medium">{stats.total.toLocaleString()}</span>
                <span>nehnuteľností</span>
              </div>
              {stats.hotDeals > 0 && (
                <div className="flex items-center gap-2 text-red-400">
                  <Flame className="w-4 h-4" />
                  <span className="text-white font-medium">{stats.hotDeals}</span>
                  <span>hot deals</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-400">
                <Euro className="w-4 h-4" />
                <span className="text-white font-medium">{stats.avgPrice.toLocaleString()}</span>
                <span>€/m² priemer</span>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Listing type */}
            <select
              value={filters.listingType}
              onChange={(e) => setFilters(f => ({ ...f, listingType: e.target.value as MapFilters["listingType"] }))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="ALL">Všetky typy</option>
              <option value="PREDAJ">Predaj</option>
              <option value="PRENAJOM">Prenájom</option>
            </select>
            
            {/* Hot deals toggle */}
            <button
              onClick={() => setFilters(f => ({ ...f, hotDealsOnly: !f.hotDealsOnly }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                filters.hotDealsOnly 
                  ? "bg-red-500/20 text-red-400 border border-red-500/50" 
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
              }`}
            >
              <Flame className="w-4 h-4" />
            </button>
            
            {/* More filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                showFilters ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-400 hover:text-white"
              } border border-slate-700`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            
            {/* Reset */}
            <button
              onClick={resetView}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
              title="Reset pohľadu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Extended filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Cena od (€)</label>
              <input
                type="number"
                value={filters.priceMin || ""}
                onChange={(e) => setFilters(f => ({ ...f, priceMin: e.target.value ? Number(e.target.value) : null }))}
                placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Cena do (€)</label>
              <input
                type="number"
                value={filters.priceMax || ""}
                onChange={(e) => setFilters(f => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : null }))}
                placeholder="∞"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-slate-400">Načítavam mapu...</span>
            </div>
          </div>
        )}
        
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* City quick navigation */}
        <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-xl rounded-xl p-3 border border-slate-800 max-w-[200px]">
          <div className="text-xs text-slate-400 mb-2">Rýchla navigácia</div>
          <div className="flex flex-wrap gap-1">
            {cities.slice(0, 6).map(city => (
              <button
                key={city.slug}
                onClick={() => flyToCity(city)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-white transition-colors"
              >
                {city.name.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-xl rounded-xl p-3 border border-slate-800">
          <div className="text-xs text-slate-400 mb-2">Legenda</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-300">Predaj</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-slate-300">Prenájom</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
              <span className="text-slate-300">Hot Deal</span>
            </div>
          </div>
        </div>
        
        {/* Count indicator */}
        <div className="absolute top-4 right-16 z-10 bg-slate-900/90 backdrop-blur-xl rounded-xl px-4 py-2 border border-slate-800">
          <div className="text-white font-medium">
            {filteredProperties.length.toLocaleString()}
            <span className="text-slate-400 ml-1 font-normal">na mape</span>
          </div>
        </div>
      </div>
    </div>
  );
}
