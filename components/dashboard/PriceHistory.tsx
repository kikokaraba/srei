"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  ArrowUp,
  ArrowDown,
  MapPin,
} from "lucide-react";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";

interface YearlyData {
  year: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

interface RegionStats {
  currentPrice: number;
  priceChange1Y: number;
  priceChange5Y: number;
  priceChange10Y: number;
  allTimeHigh: number;
  allTimeLow: number;
  averagePrice: number;
}

interface OurData {
  avgPricePerM2: number;
  propertyCount: number;
}

interface HistoryData {
  region: string;
  name: string;
  yearly: YearlyData[];
  stats: RegionStats;
  source: string;
  ourData: OurData | null;
}

const ALL_REGIONS = [
  { code: "SLOVENSKO", name: "SK", fullName: "Slovensko" },
  { code: "BRATISLAVSKY", name: "BA", fullName: "Bratislava" },
  { code: "KOSICKY", name: "KE", fullName: "Košice" },
  { code: "PRESOVSKY", name: "PO", fullName: "Prešov" },
  { code: "ZILINSKY", name: "ZA", fullName: "Žilina" },
  { code: "BANSKOBYSTRICKY", name: "BB", fullName: "Banská Bystrica" },
  { code: "TRNAVSKY", name: "TT", fullName: "Trnava" },
  { code: "TRENCIANSKY", name: "TN", fullName: "Trenčín" },
  { code: "NITRIANSKY", name: "NR", fullName: "Nitra" },
];

const REGION_FULL_NAMES: Record<string, string> = {
  SLOVENSKO: "Slovensko",
  BRATISLAVSKY: "Bratislava",
  KOSICKY: "Košice",
  PRESOVSKY: "Prešov",
  ZILINSKY: "Žilina",
  BANSKOBYSTRICKY: "Banská Bystrica",
  TRNAVSKY: "Trnava",
  TRENCIANSKY: "Trenčín",
  NITRIANSKY: "Nitra",
};

export function PriceHistory() {
  const { trackedRegionCodes, hasLocationPreferences, isLoading: prefsLoading } = useUserPreferences();
  
  // Filtrovať regióny podľa preferencií
  const availableRegions = useMemo(() => {
    if (!hasLocationPreferences || trackedRegionCodes.length === 0) {
      // Ak nie sú nastavené preferencie, ukáž všetky
      return ALL_REGIONS;
    }
    // Vždy pridaj "Slovensko" ako celkový prehľad + vybrané regióny
    return ALL_REGIONS.filter(r => 
      r.code === "SLOVENSKO" || trackedRegionCodes.includes(r.code)
    );
  }, [trackedRegionCodes, hasLocationPreferences]);

  // Nastav prvý dostupný región ako default
  const defaultRegion = availableRegions.length > 1 ? availableRegions[1].code : "SLOVENSKO";
  const [selectedRegion, setSelectedRegion] = useState(defaultRegion);
  
  // Ak sa zmenia dostupné regióny a aktuálny už nie je dostupný, prepni
  useEffect(() => {
    if (!availableRegions.find(r => r.code === selectedRegion)) {
      setSelectedRegion(defaultRegion);
    }
  }, [availableRegions, selectedRegion, defaultRegion]);
  const [period, setPeriod] = useState(10);
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);
  const chartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetchData();
  }, [selectedRegion, period]);

  useEffect(() => {
    if (data) {
      setIsAnimated(false);
      const timer = setTimeout(() => setIsAnimated(true), 50);
      return () => clearTimeout(timer);
    }
  }, [data]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fromYear = 2025 - period;
      const [response, statsResponse] = await Promise.all([
        fetch(`/api/v1/price-history?region=${selectedRegion}&type=yearly&from=${fromYear}&to=2025`),
        fetch(`/api/v1/price-history?region=${selectedRegion}&type=stats`),
      ]);
      
      const result = await response.json();
      const statsResult = await statsResponse.json();
      
      if (result.success) {
        setData({
          region: selectedRegion,
          name: result.data.name,
          yearly: result.data.yearly,
          stats: statsResult.data?.stats || {},
          source: result.data.source,
          ourData: statsResult.data?.ourData ?? result.data?.ourData ?? null,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!data?.yearly?.length) return null;
    
    const prices = data.yearly.map(d => d.avgPrice);
    const withOurs = data.ourData
      ? [...prices, data.ourData.avgPricePerM2]
      : prices;
    const maxPrice = Math.max(...withOurs);
    const minPrice = Math.min(...withOurs);
    const padding = (maxPrice - minPrice) * 0.1;
    const adjustedMax = maxPrice + padding;
    const adjustedMin = minPrice - padding;
    const range = adjustedMax - adjustedMin || 1;
    
    const points = data.yearly.map((d, i) => ({
      ...d,
      x: (i / (data.yearly.length - 1)) * 100,
      y: 100 - ((d.avgPrice - adjustedMin) / range) * 100,
      isOurs: false,
    }));
    
    // Smooth curve path
    const pathD = points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      
      const prev = points[i - 1];
      const cpX = (prev.x + point.x) / 2;
      return `${acc} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
    }, "");
    
    // Area path (for gradient fill)
    const areaD = `${pathD} L 100 100 L 0 100 Z`;
    
    // Bod "SRIA 2025" na konci grafu (rovnaká x ako posledný rok)
    const ourPoint =
      data.ourData && points.length > 0
        ? {
            year: 2025,
            avgPrice: data.ourData.avgPricePerM2,
            x: points[points.length - 1].x,
            y: 100 - ((data.ourData.avgPricePerM2 - adjustedMin) / range) * 100,
            isOurs: true,
          }
        : null;
    
    return {
      points,
      pathD,
      areaD,
      maxPrice,
      minPrice,
      isUp: prices[prices.length - 1] > prices[0],
      changePercent: ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100,
      ourPoint,
    };
  }, [data]);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `${(price / 1000).toFixed(1)}k`;
    }
    return price.toLocaleString();
  };

  if (loading && !data) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800/50 rounded-lg w-2/3"></div>
          <div className="h-64 bg-zinc-800/30 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const currentPrice = data?.stats?.currentPrice || 0;
  const priceChange = data?.stats?.priceChange1Y || 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800">
      {/* Ambient glow */}
      <div 
        className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 transition-colors duration-1000 ${
          isPositive ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Vývoj cien
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">
              {REGION_FULL_NAMES[selectedRegion]}
            </h3>
          </div>
          
          {/* Current price badge: NBS + naše dáta */}
          <div className="text-right space-y-2">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">NBS</div>
              <div className="text-xl font-semibold text-white tabular-nums">
                {currentPrice.toLocaleString()}
                <span className="text-lg text-zinc-400 ml-1">€/m²</span>
              </div>
              <div className={`flex items-center justify-end gap-1 mt-1 ${
                isPositive ? "text-emerald-400" : "text-rose-400"
              }`}>
                {isPositive ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                <span className="font-semibold tabular-nums text-xs">
                  {isPositive ? "+" : ""}{priceChange.toFixed(1)}%
                </span>
                <span className="text-zinc-500 text-xs">/ rok</span>
              </div>
            </div>
            {data?.ourData && (
              <div className="pt-2 border-t border-zinc-700/50">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">SRIA (naše dáta)</div>
                <div className="text-lg font-semibold text-emerald-400/90 tabular-nums">
                  {data.ourData.avgPricePerM2.toLocaleString()}
                  <span className="text-sm text-zinc-400 ml-1">€/m²</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  z {data.ourData.propertyCount.toLocaleString()} inzerátov
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Region pills - filtered by user preferences */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {availableRegions.length === 1 && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500">
              <MapPin className="w-3 h-3" />
              <span>Nastavte sledované lokality v Nastaveniach</span>
            </div>
          )}
          {availableRegions.map((region) => (
            <button
              key={region.code}
              onClick={() => setSelectedRegion(region.code)}
              className={`relative px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-300 whitespace-nowrap ${
                selectedRegion === region.code
                  ? "text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {selectedRegion === region.code && (
                <div className="absolute inset-0 bg-violet-500 rounded-full" />
              )}
              <span className="relative z-10">{region.name}</span>
            </button>
          ))}
        </div>

        {/* Chart */}
        {chartData && (
          <div className="relative h-56 mt-4">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-zinc-500 font-medium">
              <span>{formatPrice(chartData.maxPrice)} €</span>
              <span>{formatPrice(chartData.minPrice)} €</span>
            </div>
            
            {/* Chart area */}
            <div className="ml-12 h-full relative">
              <svg
                ref={chartRef}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-[calc(100%-2rem)]"
              >
                {/* Gradient definitions */}
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={chartData.isUp ? "#10b981" : "#f43f5e"} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={chartData.isUp ? "#10b981" : "#f43f5e"} stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={chartData.isUp ? "#10b981" : "#f43f5e"} />
                    <stop offset="100%" stopColor={chartData.isUp ? "#34d399" : "#fb7185"} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Grid lines */}
                <line x1="0" y1="25" x2="100" y2="25" stroke="#334155" strokeWidth="0.2" strokeDasharray="2,2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeWidth="0.2" strokeDasharray="2,2" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#334155" strokeWidth="0.2" strokeDasharray="2,2" />
                
                {/* Area fill */}
                <path
                  d={chartData.areaD}
                  fill="url(#areaGradient)"
                  className={`transition-all duration-1000 ${isAnimated ? "opacity-100" : "opacity-0"}`}
                />
                
                {/* Main line */}
                <path
                  d={chartData.pathD}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                  className={`transition-all duration-1000 ${isAnimated ? "opacity-100" : "opacity-0"}`}
                  style={{
                    strokeDasharray: isAnimated ? "none" : "1000",
                    strokeDashoffset: isAnimated ? "0" : "1000",
                  }}
                />
                
                {/* Data points */}
                {chartData.points.map((point, i) => (
                  <g key={point.year}>
                    {/* Hover area */}
                    <rect
                      x={point.x - 100 / chartData.points.length / 2}
                      y="0"
                      width={100 / chartData.points.length}
                      height="100"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPoint(i)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    
                    {/* Vertical line on hover */}
                    {hoveredPoint === i && (
                      <line
                        x1={point.x}
                        y1="0"
                        x2={point.x}
                        y2="100"
                        stroke={chartData.isUp ? "#10b981" : "#f43f5e"}
                        strokeWidth="0.3"
                        strokeDasharray="2,2"
                        opacity="0.5"
                      />
                    )}
                    
                    {/* Point */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={hoveredPoint === i ? "1.5" : i === chartData.points.length - 1 ? "1.2" : "0.6"}
                      fill={chartData.isUp ? "#10b981" : "#f43f5e"}
                      className={`transition-all duration-300 ${isAnimated ? "opacity-100" : "opacity-0"}`}
                      style={{ transitionDelay: `${i * 50}ms` }}
                    />
                    
                    {/* Pulse on last point */}
                    {i === chartData.points.length - 1 && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="2.5"
                        fill="none"
                        stroke={chartData.isUp ? "#10b981" : "#f43f5e"}
                        strokeWidth="0.3"
                        className="animate-ping opacity-75"
                      />
                    )}
                  </g>
                ))}
                {/* Naše dáta 2025 - bod SRIA */}
                {chartData.ourPoint && (
                  <g>
                    <circle
                      cx={chartData.ourPoint.x}
                      cy={chartData.ourPoint.y}
                      r="1.8"
                      fill="#34d399"
                      stroke="#0f0f0f"
                      strokeWidth="0.4"
                      className="opacity-100"
                    />
                    <circle
                      cx={chartData.ourPoint.x}
                      cy={chartData.ourPoint.y}
                      r="2.8"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="0.25"
                      strokeDasharray="1,1"
                      opacity="0.9"
                    />
                  </g>
                )}
              </svg>
              
              {/* Tooltip */}
              {hoveredPoint !== null && chartData.points[hoveredPoint] && (
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    left: `${chartData.points[hoveredPoint].x}%`,
                    top: `${chartData.points[hoveredPoint].y}%`,
                    transform: "translate(-50%, -120%)",
                  }}
                >
                  <div className="bg-zinc-800/90 backdrop-blur-xl border border-zinc-700/50 rounded-xl px-4 py-3 shadow-lg">
                    <div className="text-sm font-bold text-white mb-1">
                      {chartData.points[hoveredPoint].year}
                    </div>
                    <div className="text-lg font-bold text-white tabular-nums">
                      {chartData.points[hoveredPoint].avgPrice.toLocaleString()} €/m²
                    </div>
                    <div className="flex gap-3 mt-1 text-xs">
                      <span className="text-zinc-400">
                        Min: <span className="text-rose-400">{chartData.points[hoveredPoint].minPrice.toLocaleString()}</span>
                      </span>
                      <span className="text-zinc-400">
                        Max: <span className="text-emerald-400">{chartData.points[hoveredPoint].maxPrice.toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* X-axis labels */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-zinc-500 font-medium px-1">
                {chartData.points
                  .filter((_, i) => i === 0 || i === chartData.points.length - 1 || (chartData.points.length > 10 ? i % 3 === 0 : i % 2 === 0))
                  .map((point) => (
                    <span key={point.year}>{point.year}</span>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Period selector */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {[5, 10, 20].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                period === p
                  ? "bg-white/10 text-white backdrop-blur-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {p} rokov
            </button>
          ))}
        </div>

        {/* Stats footer */}
        {data?.stats && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-800/50">
            <div className="text-center">
              <div className="text-xs text-zinc-500 mb-1">5 rokov</div>
              <div className={`text-lg font-bold ${
                (data.stats.priceChange5Y || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                {(data.stats.priceChange5Y || 0) >= 0 ? "+" : ""}{data.stats.priceChange5Y?.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-zinc-500 mb-1">Maximum</div>
              <div className="text-lg font-bold text-white">
                {data.stats.allTimeHigh?.toLocaleString()} €
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-zinc-500 mb-1">10 rokov</div>
              <div className={`text-lg font-bold ${
                (data.stats.priceChange10Y || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                {(data.stats.priceChange10Y || 0) >= 0 ? "+" : ""}{data.stats.priceChange10Y?.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Legend + Source */}
        <div className="mt-4 space-y-2">
          {chartData?.ourPoint && (
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500/80" style={{ boxShadow: "0 0 0 1px #34d399" }} />
                SRIA – priemer €/m² z našich inzerátov (2025)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-zinc-500" />
                Krivka: NBS vývoj cien
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-zinc-600">
            <span>NBS: oficiálne štatistiky (Q3 2025)</span>
            <span>•</span>
            <span>SRIA: naša databáza inzerátov</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PriceHistory;
