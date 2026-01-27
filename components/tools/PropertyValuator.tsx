"use client";

import { useState, useMemo } from "react";
import {
  Home,
  MapPin,
  Ruler,
  Building2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Euro,
  Info,
  ChevronDown,
  Calendar,
  Zap,
  Target,
  BarChart3,
} from "lucide-react";

// Priemerné ceny za m² podľa mesta a typu (simulované dáta)
const MARKET_DATA: Record<string, { byty: number; domy: number; trend: number }> = {
  BRATISLAVA: { byty: 3450, domy: 2800, trend: 3.2 },
  KOSICE: { byty: 1950, domy: 1650, trend: 4.1 },
  ZILINA: { byty: 2100, domy: 1800, trend: 2.8 },
  PRESOV: { byty: 1750, domy: 1500, trend: 3.5 },
  BANSKA_BYSTRICA: { byty: 1850, domy: 1600, trend: 2.1 },
  TRNAVA: { byty: 2250, domy: 1900, trend: 3.8 },
  TRENCIN: { byty: 2000, domy: 1700, trend: 2.5 },
  NITRA: { byty: 1800, domy: 1550, trend: 3.0 },
};

// Koeficienty pre úpravu ceny
const CONDITION_MULTIPLIERS: Record<string, number> = {
  NOVOSTAVBA: 1.15,
  PO_REKONSTRUKCII: 1.08,
  DOBRY: 1.0,
  POVODNY: 0.88,
  NA_REKONSTRUKCIU: 0.75,
};

const FLOOR_MULTIPLIERS: Record<string, number> = {
  PRIZEME: 0.95,
  NIZKE: 0.98,
  STREDNE: 1.02,
  VYSOKE: 1.05,
  POSLEDNE: 1.0,
};

interface ValuationResult {
  estimatedPrice: number;
  pricePerM2: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  marketComparison: number; // % vs market average
  confidence: number;
  factors: { name: string; impact: number; description: string }[];
}

export default function PropertyValuator() {
  // Inputs
  const [city, setCity] = useState("BRATISLAVA");
  const [propertyType, setPropertyType] = useState<"byty" | "domy">("byty");
  const [area, setArea] = useState(65);
  const [rooms, setRooms] = useState(2);
  const [condition, setCondition] = useState("DOBRY");
  const [floor, setFloor] = useState("STREDNE");
  const [hasBalcony, setHasBalcony] = useState(true);
  const [hasParking, setHasParking] = useState(false);
  const [hasElevator, setHasElevator] = useState(true);
  const [yearBuilt, setYearBuilt] = useState(2010);
  
  // Calculate valuation
  const valuation = useMemo((): ValuationResult => {
    const marketData = MARKET_DATA[city];
    const basePrice = marketData[propertyType];
    
    // Apply multipliers
    let adjustedPrice = basePrice;
    const factors: ValuationResult["factors"] = [];
    
    // Condition
    const conditionMult = CONDITION_MULTIPLIERS[condition];
    adjustedPrice *= conditionMult;
    factors.push({
      name: "Stav nehnuteľnosti",
      impact: (conditionMult - 1) * 100,
      description: condition.replace(/_/g, " ").toLowerCase(),
    });
    
    // Floor (only for apartments)
    if (propertyType === "byty") {
      const floorMult = FLOOR_MULTIPLIERS[floor];
      adjustedPrice *= floorMult;
      factors.push({
        name: "Poschodie",
        impact: (floorMult - 1) * 100,
        description: floor.replace(/_/g, " ").toLowerCase(),
      });
    }
    
    // Amenities
    if (hasBalcony) {
      adjustedPrice *= 1.03;
      factors.push({ name: "Balkón/Terasa", impact: 3, description: "áno" });
    }
    if (hasParking) {
      adjustedPrice *= 1.05;
      factors.push({ name: "Parkovanie", impact: 5, description: "vlastné" });
    }
    if (hasElevator && propertyType === "byty") {
      adjustedPrice *= 1.02;
      factors.push({ name: "Výťah", impact: 2, description: "áno" });
    }
    
    // Age adjustment
    const age = new Date().getFullYear() - yearBuilt;
    let ageMult = 1;
    if (age <= 5) ageMult = 1.05;
    else if (age <= 15) ageMult = 1.0;
    else if (age <= 30) ageMult = 0.95;
    else ageMult = 0.90;
    
    adjustedPrice *= ageMult;
    factors.push({
      name: "Vek stavby",
      impact: (ageMult - 1) * 100,
      description: `${age} rokov`,
    });
    
    // Size efficiency (larger apartments have lower price per m2)
    const sizeMult = area > 80 ? 0.95 : area < 40 ? 1.05 : 1;
    adjustedPrice *= sizeMult;
    
    // Calculate final values
    const estimatedPrice = Math.round(adjustedPrice * area);
    const priceRangeLow = Math.round(estimatedPrice * 0.9);
    const priceRangeHigh = Math.round(estimatedPrice * 1.1);
    const marketComparison = ((adjustedPrice / basePrice) - 1) * 100;
    
    // Confidence based on data completeness
    const confidence = 85 + (hasBalcony ? 2 : 0) + (hasParking ? 2 : 0) + (yearBuilt > 2000 ? 3 : 0);
    
    return {
      estimatedPrice,
      pricePerM2: adjustedPrice,
      priceRangeLow,
      priceRangeHigh,
      marketComparison,
      confidence: Math.min(95, confidence),
      factors,
    };
  }, [city, propertyType, area, condition, floor, hasBalcony, hasParking, hasElevator, yearBuilt]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sk-SK", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Location & Type */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              Lokalita a typ
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Mesto</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BRATISLAVA">Bratislava</option>
                  <option value="KOSICE">Košice</option>
                  <option value="ZILINA">Žilina</option>
                  <option value="PRESOV">Prešov</option>
                  <option value="BANSKA_BYSTRICA">Banská Bystrica</option>
                  <option value="TRNAVA">Trnava</option>
                  <option value="TRENCIN">Trenčín</option>
                  <option value="NITRA">Nitra</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Typ nehnuteľnosti</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPropertyType("byty")}
                    className={`px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      propertyType === "byty"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Byt
                  </button>
                  <button
                    onClick={() => setPropertyType("domy")}
                    className={`px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      propertyType === "domy"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    Dom
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Size & Layout */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-emerald-400" />
              Veľkosť a dispozícia
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center justify-between text-sm text-zinc-400 mb-2">
                  <span>Úžitková plocha</span>
                  <span className="text-white font-medium">{area} m²</span>
                </label>
                <input
                  type="range"
                  min={20}
                  max={200}
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
              
              <div>
                <label className="flex items-center justify-between text-sm text-zinc-400 mb-2">
                  <span>Počet izieb</span>
                  <span className="text-white font-medium">{rooms}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={rooms}
                  onChange={(e) => setRooms(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>
          
          {/* Condition & Details */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" />
              Stav a vybavenie
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Stav nehnuteľnosti</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NOVOSTAVBA">Novostavba</option>
                  <option value="PO_REKONSTRUKCII">Po rekonštrukcii</option>
                  <option value="DOBRY">Dobrý stav</option>
                  <option value="POVODNY">Pôvodný stav</option>
                  <option value="NA_REKONSTRUKCIU">Vyžaduje rekonštrukciu</option>
                </select>
              </div>
              
              {propertyType === "byty" && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Poschodie</label>
                  <select
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PRIZEME">Prízemie</option>
                    <option value="NIZKE">1-2 poschodie</option>
                    <option value="STREDNE">3-5 poschodie</option>
                    <option value="VYSOKE">6+ poschodie</option>
                    <option value="POSLEDNE">Posledné poschodie</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Rok výstavby</label>
                <input
                  type="number"
                  min={1900}
                  max={2026}
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Amenities */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setHasBalcony(!hasBalcony)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  hasBalcony
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                Balkón/Terasa
              </button>
              <button
                onClick={() => setHasParking(!hasParking)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  hasParking
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                Parkovanie
              </button>
              {propertyType === "byty" && (
                <button
                  onClick={() => setHasElevator(!hasElevator)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    hasElevator
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  Výťah
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Results */}
        <div className="space-y-4">
          {/* Main Result */}
          <div className="bg-emerald-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 text-emerald-100 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm">AI Odhad ceny</span>
            </div>
            <div className="text-4xl font-bold mb-2">
              {formatCurrency(valuation.estimatedPrice)}
            </div>
            <div className="text-emerald-100 text-sm">
              {formatCurrency(valuation.priceRangeLow)} - {formatCurrency(valuation.priceRangeHigh)}
            </div>
            
            <div className="mt-4 pt-4 border-t border-emerald-500/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-100">Presnosť odhadu</span>
                <span className="font-medium">{valuation.confidence}%</span>
              </div>
              <div className="mt-2 h-2 bg-emerald-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${valuation.confidence}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Price per m2 */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <Euro className="w-4 h-4" />
              Cena za m²
            </div>
            <div className="text-lg font-semibold text-white">
              {formatCurrency(valuation.pricePerM2)}
            </div>
            <div className={`flex items-center gap-1 text-sm mt-1 ${
              valuation.marketComparison >= 0 ? "text-emerald-400" : "text-red-400"
            }`}>
              {valuation.marketComparison >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {valuation.marketComparison >= 0 ? "+" : ""}{valuation.marketComparison.toFixed(1)}% vs. priemer
            </div>
          </div>
          
          {/* Market Average */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <BarChart3 className="w-4 h-4" />
              Trhový priemer v {city.replace(/_/g, " ")}
            </div>
            <div className="text-base font-semibold text-white">
              {formatCurrency(MARKET_DATA[city][propertyType])}/m²
            </div>
            <div className="flex items-center gap-1 text-sm text-emerald-400 mt-1">
              <TrendingUp className="w-4 h-4" />
              +{MARKET_DATA[city].trend}% za rok
            </div>
          </div>
          
          {/* Factors */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-3">
              <Target className="w-4 h-4" />
              Faktory ovplyvňujúce cenu
            </div>
            <div className="space-y-2">
              {valuation.factors.map((factor, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{factor.name}</span>
                  <span className={`font-medium ${
                    factor.impact >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {factor.impact >= 0 ? "+" : ""}{factor.impact.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Disclaimer */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-2 text-blue-400 text-xs">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Odhad je orientačný a vychádza z aktuálnych trhových dát. Pre presné nacenenie odporúčame kontaktovať realitného makléra.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
