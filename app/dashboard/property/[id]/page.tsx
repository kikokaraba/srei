"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Home,
  TrendingUp,
  TrendingDown,
  Bookmark,
  BookmarkCheck,
  Loader2,
  Shield,
  Copy,
  Clock,
  Target,
  Calendar,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Info,
  Banknote,
  Calculator,
  Building2,
  Zap,
  History,
  Users,
  PiggyBank,
  Percent,
  Trophy,
} from "lucide-react";
import { YieldCard } from "@/components/YieldCard";

interface Property {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  city: string;
  district: string;
  address: string;
  price: number;
  area_m2: number;
  price_per_m2: number;
  rooms: number | null;
  floor: number | null;
  condition: string;
  energy_certificate: string;
  source_url: string | null;
  source: string;
  is_distressed: boolean;
  days_on_market: number;
  listing_type: string;
  createdAt: string;
  investmentMetrics: {
    gross_yield: number;
    net_yield: number;
    cash_on_cash: number;
    price_to_rent_ratio: number;
  } | null;
  priceHistory: {
    price: number;
    recorded_at: string;
  }[];
}

interface DuplicateProperty {
  id: string;
  source: string;
  price: number;
  title: string;
  source_url: string | null;
}

interface DuplicateInfo {
  count: number;
  sources: string[];
  priceRange: { min: number; max: number };
  savings: number | null;
  duplicates: DuplicateProperty[];
}

interface MarketComparison {
  avgPricePerM2: number;
  medianPricePerM2: number;
  propertyVsAvg: number; // percentage difference
  position: string; // "cheap", "average", "expensive"
}

interface EstimatedRent {
  estimatedRent: number;
  medianRent?: number;
  rentRange: { min: number; max: number };
  basedOnCount: number;
  confidence: "high" | "medium" | "low";
  grossYield: number;
  similarProperties: {
    id: string;
    price: number;
    area_m2: number;
    rooms: number | null;
    district: string;
  }[];
}

interface TimelineEvent {
  type: string;
  date: string;
  description: string;
}

interface YieldData {
  averageRent: number;
  rentRange: { min: number; max: number };
  sampleSize: number;
  grossYield: number;
  netYield: number;
  priceToRent: number;
  paybackYears: number;
  monthlyExpenses: number;
  monthlyProfit: number;
}

interface YieldComparison {
  propertyYield: number;
  cityAverage: number;
  districtAverage: number;
  countryAverage: number;
  rating: "EXCELLENT" | "GOOD" | "AVERAGE" | "BELOW_AVERAGE" | "POOR";
  percentile: number;
}

interface YieldResponse {
  yield: YieldData;
  comparison: YieldComparison;
}

interface PropertyTimeline {
  priceHistory: {
    price: number;
    date: string;
    changePercent: number | null;
  }[];
  events: TimelineEvent[];
  summary: {
    totalPriceChange: number;
    totalPriceChangePercent: number;
    daysOnMarket: number;
    priceDrops: number;
    reListings: number;
  };
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateInfo | null>(null);
  const [marketComparison, setMarketComparison] = useState<MarketComparison | null>(null);
  const [estimatedRent, setEstimatedRent] = useState<EstimatedRent | null>(null);
  const [timeline, setTimeline] = useState<PropertyTimeline | null>(null);
  const [yieldData, setYieldData] = useState<YieldResponse | null>(null);

  useEffect(() => {
    const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
    if (!id) {
      setLoading(false);
      return;
    }

    setProperty(null);
    setDuplicates(null);
    setMarketComparison(null);
    setEstimatedRent(null);
    setTimeline(null);
    setYieldData(null);
    setLoading(true);

    const fetchProperty = async () => {
      try {
        const res = await fetch(`/api/v1/properties/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProperty(data.data);

          fetchDuplicates(data.data);
          fetchMarketComparison(data.data);
          fetchEstimatedRent(data.data);
          fetchTimeline(data.data);
          fetchYieldData(data.data);
        } else if (res.status === 401) {
          setProperty(null);
        }
      } catch (error) {
        console.error("Error fetching property:", error);
        setProperty(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchDuplicates = async (prop: Property) => {
      try {
        const response = await fetch(`/api/v1/properties/${prop.id}/duplicates`);
        if (response.ok) {
          const data = await response.json();
          setDuplicates(data.data);
        }
      } catch (error) {
        console.error("Error fetching duplicates:", error);
      }
    };

    const fetchEstimatedRent = async (prop: Property) => {
      try {
        const response = await fetch(`/api/v1/properties/${prop.id}/estimated-rent`);
        if (response.ok) {
          const data = await response.json();
          setEstimatedRent(data.data);
        }
      } catch (error) {
        console.error("Error fetching estimated rent:", error);
      }
    };

    const fetchMarketComparison = async (prop: Property) => {
      try {
        const response = await fetch(`/api/v1/market/comparison?city=${prop.city}&area=${prop.area_m2}`);
        if (response.ok) {
          const data = await response.json();
          setMarketComparison(data.data);
        }
      } catch (error) {
        console.error("Error fetching market comparison:", error);
      }
    };

    const fetchTimeline = async (prop: Property) => {
      try {
        const response = await fetch(`/api/v1/properties/${prop.id}/timeline`);
        if (response.ok) {
          const data = await response.json();
          setTimeline(data.data);
        }
      } catch (error) {
        console.error("Error fetching timeline:", error);
      }
    };

    const fetchYieldData = async (prop: Property) => {
      // Yield len pre nehnuteľnosti na predaj s cenou
      if (prop.listing_type !== "PREDAJ" || prop.price <= 0) return;
      
      try {
        const response = await fetch(`/api/v1/yield?propertyId=${prop.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setYieldData(data.data);
          }
        }
      } catch (error) {
        console.error("Error fetching yield data:", error);
      }
    };

    fetchProperty();
  }, [params.id]);

  const priceChange = useMemo(() => {
    if (!property) return null;
    const hist = property.priceHistory ?? [];
    if (hist.length < 2) return null;
    const sortedHistory = [...hist].sort((a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    const firstPrice = sortedHistory[0]?.price;
    const currentPrice = property.price;
    if (!firstPrice || firstPrice === currentPrice || firstPrice === 0) return null;
    return ((currentPrice - firstPrice) / firstPrice) * 100;
  }, [property?.priceHistory, property?.price]);

  const calculateInvestorScore = (prop: Property): number => {
    let score = 50;
    if (prop.investmentMetrics) {
      score += Math.min(prop.investmentMetrics.gross_yield * 5, 30);
    }
    if (prop.price_per_m2 < 1500) score += 15;
    else if (prop.price_per_m2 < 2000) score += 10;
    else if (prop.price_per_m2 < 2500) score += 5;
    if (prop.is_distressed) score += 10;
    if (prop.days_on_market > 60) score += 5;
    if (prop.condition === "NOVOSTAVBA") score += 5;
    return Math.min(Math.max(score, 0), 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (score >= 65) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    if (score >= 50) return "text-blue-400 bg-blue-500/10 border-blue-500/30";
    return "text-zinc-400 bg-zinc-800 border-zinc-700";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Výborná investícia";
    if (score >= 65) return "Dobrá príležitosť";
    if (score >= 50) return "Priemerná";
    return "Pod priemerom";
  };

  const isInvestmentGem = !!(property && yieldData?.comparison &&
    yieldData.yield.grossYield > yieldData.comparison.cityAverage * 1.2);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="relative">
          <div className="w-10 h-10 border-2 border-zinc-800 rounded-full"></div>
          <div className="absolute top-0 left-0 w-10 h-10 border-2 border-emerald-500 rounded-full animate-spin border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-16">
        <h2 className="text-base text-zinc-400 mb-4">Nehnuteľnosť nenájdená</h2>
        <Link href="/dashboard/properties" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Späť na vyhľadávanie
        </Link>
      </div>
    );
  }

  const score = calculateInvestorScore(property);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header - Premium */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">DETAIL NEHNUTEĽNOSTI</p>
            {isInvestmentGem && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                <Trophy className="w-3 h-3" />
                INVESTIČNÝ TRHÁK
              </span>
            )}
          </div>
          <h1 className="text-xl font-medium text-zinc-100 leading-tight mb-2 truncate">{property.title}</h1>
          <div className="flex items-center gap-1.5 text-zinc-500 text-sm">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{property.address}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`p-2.5 rounded-lg border transition-all ${
              isSaved 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700"
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
          {property.source_url && (
            <a
              href={property.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Otvoriť</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Price & Key Stats - Premium */}
          <div className="premium-card p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                {property.price === 0 ? (
                  <>
                    <p className="text-2xl font-semibold text-amber-400 tracking-tight">Cena dohodou</p>
                    <p className="text-sm text-zinc-500 mt-1">Kontaktujte predajcu</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-semibold text-zinc-100 font-mono tracking-tight">€{property.price.toLocaleString()}</p>
                    <p className="text-sm text-zinc-500 font-mono mt-1">€{property.price_per_m2.toLocaleString()}/m²</p>
                  </>
                )}
                {priceChange !== null && priceChange !== 0 && (
                  <div className={`flex items-center gap-1 mt-2 text-xs font-mono ${priceChange < 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {priceChange < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    <span>{Math.abs(priceChange).toFixed(1)}% od pôvodnej ceny</span>
                  </div>
                )}
              </div>
              <div className={`px-3 py-2 rounded-lg border ${getScoreColor(score).replace('text-', 'text-').replace('bg-', 'bg-').replace('border-', 'border-')}`}>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span className="text-lg font-semibold font-mono">{score}</span>
                </div>
                <p className="text-[10px] mt-0.5 opacity-80">{getScoreLabel(score)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-zinc-800/30">
                <Home className="w-4 h-4 text-zinc-600 mx-auto mb-1.5" />
                <p className="text-base font-semibold text-zinc-200 font-mono">{property.rooms || "–"}</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Izby</p>
              </div>
              <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-zinc-800/30">
                <Building2 className="w-4 h-4 text-zinc-600 mx-auto mb-1.5" />
                <p className="text-base font-semibold text-zinc-200 font-mono">{property.area_m2}</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">m²</p>
              </div>
              <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-zinc-800/30">
                <Clock className="w-4 h-4 text-zinc-600 mx-auto mb-1.5" />
                <p className="text-base font-semibold text-zinc-200 font-mono">{property.days_on_market}</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Dní</p>
              </div>
              <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-zinc-800/30">
                <Calendar className="w-4 h-4 text-zinc-600 mx-auto mb-1.5" />
                <p className="text-base font-semibold text-zinc-200 font-mono">
                  {new Date(property.createdAt).toLocaleDateString("sk-SK")}
                </p>
                <p className="text-xs text-zinc-400">Pridané</p>
              </div>
            </div>
          </div>

          {/* Yield Engine Card - len pre nehnuteľnosti na predaj */}
          {yieldData && property.listing_type === "PREDAJ" && (
            <YieldCard 
              yield={yieldData.yield}
              comparison={yieldData.comparison}
              propertyPrice={property.price}
              city={property.city}
            />
          )}

          {/* Investor Analysis */}
          <div className="premium-card p-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Investičná analýza
            </h2>

            {property.investmentMetrics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <p className="text-2xl font-bold text-emerald-400">
                    {property.investmentMetrics.gross_yield.toFixed(1)}%
                  </p>
                  <p className="text-sm text-zinc-400">Hrubý výnos</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-2xl font-bold text-blue-400">
                    {property.investmentMetrics.net_yield.toFixed(1)}%
                  </p>
                  <p className="text-sm text-zinc-400">Čistý výnos</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-2xl font-bold text-purple-400">
                    {property.investmentMetrics.cash_on_cash.toFixed(1)}%
                  </p>
                  <p className="text-sm text-zinc-400">Cash-on-Cash</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-2xl font-bold text-amber-400">
                    {property.investmentMetrics.price_to_rent_ratio.toFixed(0)}
                  </p>
                  <p className="text-sm text-zinc-400">Price-to-Rent</p>
                </div>
              </div>
            ) : (
              <p className="text-zinc-400 mb-6">Investičné metriky nie sú dostupné</p>
            )}

            {/* Market Comparison */}
            {marketComparison && (
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">Porovnanie s trhom v {property.city}</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Priemerná cena/m²</span>
                      <span className="text-white">€{marketComparison.avgPricePerM2.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${marketComparison.propertyVsAvg < 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width: `${Math.min(Math.abs(marketComparison.propertyVsAvg) + 50, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    marketComparison.propertyVsAvg < -10 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : marketComparison.propertyVsAvg > 10 
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-zinc-600 text-zinc-300"
                  }`}>
                    {marketComparison.propertyVsAvg > 0 ? "+" : ""}{marketComparison.propertyVsAvg.toFixed(0)}%
                  </div>
                </div>
              </div>
            )}

            {/* Estimated Rent from similar rentals */}
            {estimatedRent && (
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4 mt-4">
                <h3 className="font-medium text-violet-400 mb-3 flex items-center gap-2">
                  <Banknote className="w-5 h-5" />
                  Odhadovaný nájom (z podobných bytov)
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-2xl font-bold text-white">€{estimatedRent.estimatedRent}/mes</p>
                    <p className="text-xs text-zinc-400">
                      Rozpätie: €{estimatedRent.rentRange.min} – €{estimatedRent.rentRange.max}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-400">{estimatedRent.grossYield.toFixed(1)}%</p>
                    <p className="text-xs text-zinc-400">Potenciálny hrubý výnos</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    Na základe {estimatedRent.basedOnCount} podobných prenájmov
                  </span>
                  <span className={`px-2 py-0.5 rounded ${
                    estimatedRent.confidence === "high" 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : estimatedRent.confidence === "medium"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-zinc-600 text-zinc-400"
                  }`}>
                    {estimatedRent.confidence === "high" ? "Vysoká" : estimatedRent.confidence === "medium" ? "Stredná" : "Nízka"} spoľahlivosť
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Price History Timeline */}
          {timeline && timeline.priceHistory.length > 1 && (
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-6">
              <h2 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                História ceny
              </h2>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{timeline.summary.daysOnMarket}</p>
                  <p className="text-xs text-zinc-400">Dní na trhu</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{timeline.summary.priceDrops}</p>
                  <p className="text-xs text-zinc-400">Zníženia ceny</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${
                  timeline.summary.totalPriceChangePercent < 0 
                    ? "bg-emerald-500/20" 
                    : timeline.summary.totalPriceChangePercent > 0 
                    ? "bg-rose-500/20" 
                    : "bg-zinc-800/50"
                }`}>
                  <p className={`text-2xl font-bold ${
                    timeline.summary.totalPriceChangePercent < 0 
                      ? "text-emerald-400" 
                      : timeline.summary.totalPriceChangePercent > 0 
                      ? "text-rose-400" 
                      : "text-white"
                  }`}>
                    {timeline.summary.totalPriceChangePercent > 0 ? "+" : ""}{timeline.summary.totalPriceChangePercent}%
                  </p>
                  <p className="text-xs text-zinc-400">Celková zmena</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${
                  timeline.summary.totalPriceChange < 0 ? "bg-emerald-500/20" : "bg-zinc-800/50"
                }`}>
                  <p className={`text-2xl font-bold ${
                    timeline.summary.totalPriceChange < 0 ? "text-emerald-400" : "text-white"
                  }`}>
                    €{Math.abs(timeline.summary.totalPriceChange).toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {timeline.summary.totalPriceChange < 0 ? "Úspora" : "Navýšenie"}
                  </p>
                </div>
              </div>

              {/* Timeline Events */}
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-700"></div>
                <div className="space-y-4">
                  {timeline.events.map((event, index) => (
                    <div key={index} className="relative pl-10">
                      <div className={`absolute left-2 w-4 h-4 rounded-full border-2 ${
                        event.type === "LISTED" 
                          ? "bg-blue-500 border-blue-400" 
                          : event.type === "PRICE_DROP"
                          ? "bg-emerald-500 border-emerald-400"
                          : event.type === "PRICE_INCREASE"
                          ? "bg-rose-500 border-rose-400"
                          : event.type === "RELISTED"
                          ? "bg-amber-500 border-amber-400"
                          : "bg-zinc-500 border-zinc-400"
                      }`}></div>
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${
                            event.type === "PRICE_DROP" 
                              ? "text-emerald-400" 
                              : event.type === "PRICE_INCREASE"
                              ? "text-rose-400"
                              : event.type === "RELISTED"
                              ? "text-amber-400"
                              : "text-white"
                          }`}>
                            {event.type === "LISTED" && "🆕 Pridané na trh"}
                            {event.type === "PRICE_DROP" && "📉 Zníženie ceny"}
                            {event.type === "PRICE_INCREASE" && "📈 Zvýšenie ceny"}
                            {event.type === "RELISTED" && "🔄 Návrat na trh"}
                            {event.type === "REMOVED" && "❌ Odstránené"}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {new Date(event.date).toLocaleDateString("sk-SK")}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 mt-1">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Chart (simple) */}
              {timeline.priceHistory.length > 2 && (
                <div className="mt-6 pt-4 border-t border-zinc-700">
                  <p className="text-sm text-zinc-400 mb-3">Vývoj ceny:</p>
                  <div className="flex items-end gap-1 h-24">
                    {timeline.priceHistory.map((ph, index) => {
                      const maxPrice = Math.max(...timeline.priceHistory.map(p => p.price));
                      const minPrice = Math.min(...timeline.priceHistory.map(p => p.price));
                      const range = maxPrice - minPrice || 1;
                      const heightPercent = ((ph.price - minPrice) / range) * 80 + 20;
                      
                      return (
                        <div
                          key={index}
                          className="flex-1 flex flex-col items-center group relative"
                        >
                          <div
                            className={`w-full rounded-t transition-all ${
                              index === timeline.priceHistory.length - 1
                                ? "bg-indigo-500"
                                : ph.changePercent && ph.changePercent < 0
                                ? "bg-emerald-500/60"
                                : "bg-zinc-600"
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          ></div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                            <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs whitespace-nowrap">
                              <p className="text-white font-medium">€{ph.price.toLocaleString()}</p>
                              <p className="text-zinc-400">
                                {new Date(ph.date).toLocaleDateString("sk-SK")}
                              </p>
                              {ph.changePercent && (
                                <p className={ph.changePercent < 0 ? "text-emerald-400" : "text-rose-400"}>
                                  {ph.changePercent > 0 ? "+" : ""}{ph.changePercent}%
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500 mt-2">
                    <span>{new Date(timeline.priceHistory[0].date).toLocaleDateString("sk-SK", { month: "short", year: "2-digit" })}</span>
                    <span>{new Date(timeline.priceHistory[timeline.priceHistory.length - 1].date).toLocaleDateString("sk-SK", { month: "short", year: "2-digit" })}</span>
                  </div>
                </div>
              )}

              {/* Investor Insight */}
              {timeline.summary.priceDrops >= 2 && (
                <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <p className="text-sm text-emerald-300">
                    💡 <strong>Zúfalý predajca:</strong> Cena bola znížená {timeline.summary.priceDrops}x za {timeline.summary.daysOnMarket} dní. 
                    Vysoká šanca na vyjednanie ďalšej zľavy!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cross-Portal Price Comparison - "Dostupné u partnerov" */}
          {duplicates && duplicates.count > 1 && (
            <div className="premium-card overflow-hidden">
              {/* Header s potenciálnou úsporou */}
              <div className="p-4 sm:p-6 border-b border-zinc-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Dostupné u partnerov
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    Rovnaká nehnuteľnosť na {duplicates.count} portáloch
                  </p>
                </div>
                {duplicates.savings && duplicates.savings > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                    <PiggyBank className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-xs text-emerald-300">Ušetri až</p>
                      <p className="text-lg font-bold text-emerald-400">
                        €{duplicates.savings.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Porovnanie cien - karty */}
              <div className="p-4 sm:p-6">
                <div className="space-y-3">
                  {/* Aktuálny inzerát */}
                  <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Home className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-500/30 rounded text-xs text-blue-300 font-medium">
                            {property.source}
                          </span>
                          <span className="text-xs text-blue-400">Práve prezeráte</span>
                        </div>
                        <p className="text-xl font-bold text-white mt-1">
                          €{property.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ostatné portály */}
                  {[...duplicates.duplicates]
                    .sort((a, b) => a.price - b.price)
                    .map((dup, index) => {
                      const isLowest = dup.price === duplicates.priceRange.min;
                      const priceDiff = property.price - dup.price;
                      const priceDiffPercent = property.price > 0
                        ? ((priceDiff / property.price) * 100).toFixed(1)
                        : "0";
                      
                      return (
                        <div 
                          key={dup.id}
                          className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                            isLowest 
                              ? "bg-emerald-500/10 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10" 
                              : "bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isLowest ? "bg-emerald-500/20" : "bg-zinc-700"
                            }`}>
                              <span className="text-lg font-bold text-white">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  isLowest 
                                    ? "bg-emerald-500/30 text-emerald-300" 
                                    : "bg-zinc-700 text-zinc-300"
                                }`}>
                                  {dup.source}
                                </span>
                                {isLowest && (
                                  <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-xs font-bold animate-pulse">
                                    🏆 NAJLEPŠIA CENA
                                  </span>
                                )}
                              </div>
                              <p className="text-xl font-bold text-white mt-1">
                                €{dup.price.toLocaleString()}
                                {priceDiff > 0 && (
                                  <span className="text-sm font-normal text-emerald-400 ml-2">
                                    -{priceDiffPercent}%
                                  </span>
                                )}
                                {priceDiff < 0 && (
                                  <span className="text-sm font-normal text-red-400 ml-2">
                                    +{Math.abs(priceDiff).toLocaleString()}€
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <Link
                              href={`/dashboard/property/${dup.id}`}
                              className="p-2.5 rounded-lg bg-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-600 transition-colors"
                              title="Detail v SRIA"
                            >
                              <Home className="w-4 h-4" />
                            </Link>
                            {dup.source_url && (
                              <a
                                href={dup.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-2.5 rounded-lg transition-colors ${
                                  isLowest 
                                    ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                                title="Otvoriť na portáli"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Insight */}
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-sm text-zinc-300">
                    <strong className="text-white">💡 Investorský tip:</strong> Tá istá nehnuteľnosť môže mať rôzne ceny 
                    podľa toho, či ju predáva majiteľ (Bazoš) alebo realitka (Reality.sk). 
                    {duplicates.savings && duplicates.savings > 1000 && (
                      <span className="text-emerald-400 font-medium">
                        {" "}Tu môžete ušetriť €{duplicates.savings.toLocaleString()} ak pôjdete cez lacnejší portál!
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Negotiation Tips */}
          {property.days_on_market > 30 && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-6">
              <h2 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Tipy na vyjednávanie
              </h2>
              
              <div className="space-y-3">
                {property.days_on_market > 90 && (
                  <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">Motivovaný predajca</p>
                      <p className="text-sm text-zinc-400">
                        Nehnuteľnosť je na trhu {property.days_on_market} dní. Navrhni cenu o 10-15% nižšiu.
                      </p>
                    </div>
                  </div>
                )}
                {property.days_on_market > 60 && property.days_on_market <= 90 && (
                  <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">Priestor na vyjednávanie</p>
                      <p className="text-sm text-zinc-400">
                        Po {property.days_on_market} dňoch môže byť predajca otvorený zľave 5-10%.
                      </p>
                    </div>
                  </div>
                )}
                {priceChange !== null && priceChange < 0 && (
                  <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">Cena už klesla</p>
                      <p className="text-sm text-zinc-400">
                        Predajca už znížil cenu o {Math.abs(priceChange).toFixed(1)}%. Môže byť ochotný ísť ešte nižšie.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="premium-card p-5">
            <h3 className="font-bold text-white mb-4">Rýchle akcie</h3>
            <div className="space-y-3">
              <a
                href={property.source_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Otvoriť inzerát
              </a>
              <Link 
                href={`/dashboard/calculators?calc=mortgage&price=${property.price}&title=${encodeURIComponent(property.title)}`}
                className="flex items-center gap-3 w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                <Calculator className="w-5 h-5" />
                Hypotekárna kalkulačka
              </Link>
              <Link 
                href={`/dashboard/calculators?calc=investment&price=${property.price}&area=${property.area_m2}&rent=${estimatedRent?.estimatedRent ?? 0}&title=${encodeURIComponent(property.title)}`}
                className="flex items-center gap-3 w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                <PiggyBank className="w-5 h-5" />
                Výnosová kalkulačka
              </Link>
            </div>
          </div>

          {/* Property Details */}
          <div className="premium-card p-5">
            <h3 className="font-bold text-white mb-4">Detaily</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Stav</span>
                <span className="text-white">
                  {property.condition === "POVODNY" ? "Pôvodný" : 
                   property.condition === "REKONSTRUKCIA" ? "Po rekonštrukcii" : 
                   property.condition === "NOVOSTAVBA" ? "Novostavba" : property.condition}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Energetický certifikát</span>
                <span className="text-white">{property.energy_certificate || "–"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Poschodie</span>
                <span className="text-white">{property.floor || "–"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Zdroj</span>
                <span className="text-white">{property.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Typ</span>
                <span className="text-white">
                  {property.listing_type === "PREDAJ" ? "Predaj" : "Prenájom"}
                </span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="premium-card p-5">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-zinc-400" />
              Vysvetlenie ikoniek
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white">Investičné skóre</p>
                  <p className="text-zinc-400 text-xs">0-100 bodov podľa výnosnosti</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center justify-center">
                  <Copy className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-white">Duplicity</p>
                  <p className="text-zinc-400 text-xs">Inzerát na viacerých portáloch</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white">Zníženie ceny</p>
                  <p className="text-zinc-400 text-xs">Cena bola znížená</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-white">Hot Deal</p>
                  <p className="text-zinc-400 text-xs">15%+ pod trhovou cenou</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-white">Vyjednaj zľavu</p>
                  <p className="text-zinc-400 text-xs">Dlho na trhu, navrhni -10%</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-500/20 border border-violet-500/30 rounded-lg flex items-center justify-center">
                  <span className="text-sm">🆕</span>
                </div>
                <div>
                  <p className="text-white">Čerstvý inzerát</p>
                  <p className="text-zinc-400 text-xs">Pridané pred menej ako 3 dňami</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-600/30 border border-zinc-500/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-white">Dni na trhu</p>
                  <p className="text-zinc-400 text-xs">Koľko dní je v ponuke</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
