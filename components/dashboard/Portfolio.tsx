"use client";

import { useState, useEffect } from "react";
import {
  Briefcase,
  Plus,
  TrendingUp,
  TrendingDown,
  Home,
  Building,
  Euro,
  Percent,
  Calendar,
  MapPin,
  X,
  Edit,
  Trash2,
  ChevronRight,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Users,
  PiggyBank,
  BarChart3,
  Loader2,
  Receipt,
  CreditCard,
} from "lucide-react";

interface PortfolioProperty {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string | null;
  propertyType: string;
  area_m2: number;
  rooms: number | null;
  floor: number | null;
  purchaseDate: string;
  purchasePrice: number;
  purchaseCosts: number;
  saleDate: string | null;
  salePrice: number | null;
  saleCosts: number | null;
  currentValue: number;
  lastValuationDate: string;
  hasMortgage: boolean;
  mortgageAmount: number | null;
  mortgageRate: number | null;
  mortgagePayment: number | null;
  mortgageStart: string | null;
  mortgageEnd: string | null;
  isRented: boolean;
  monthlyRent: number | null;
  tenantName: string | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  depositAmount: number | null;
  monthlyExpenses: number;
  annualTax: number | null;
  annualInsurance: number | null;
  status: string;
  notes: string | null;
  photos: string;
  createdAt: string;
  updatedAt: string;
  transactions: any[];
  valuations: any[];
}

interface PortfolioMetrics {
  totalProperties: number;
  soldProperties: number;
  totalValue: number;
  totalInvested: number;
  totalEquity: number;
  totalAppreciation: number;
  appreciationPercent: number;
  monthlyRentIncome: number;
  monthlyMortgagePayments: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  grossYield: number;
  netYield: number;
  realizedGains: number;
  rentedProperties: number;
  vacantProperties: number;
}

import { 
  REGION_LABELS,
  REGION_OPTIONS,
  getCityRegionLabel,
  PROPERTY_TYPE_LABELS, 
  PORTFOLIO_STATUS_LABELS as STATUS_LABELS 
} from "@/lib/constants";

export function Portfolio() {
  const [properties, setProperties] = useState<PortfolioProperty[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PortfolioProperty | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch("/api/v1/portfolio");
      const data = await res.json();
      if (data.success) {
        setProperties(data.data.properties);
        setMetrics(data.data.metrics);
      }
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm("Naozaj chcete vymazať túto nehnuteľnosť z portfólia?")) return;

    try {
      const res = await fetch(`/api/v1/portfolio/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPortfolio();
        setSelectedProperty(null);
      }
    } catch (error) {
      console.error("Error deleting property:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header - Premium */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-1">INVESTÍCIE</p>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Moje portfólio</h2>
          <p className="text-sm text-zinc-500 mt-1 hidden sm:block">
            Spravujte svoje investičné nehnuteľnosti
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Pridať</span>
        </button>
      </div>

      {/* Portfolio Overview */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
          <MetricCard
            icon={<Wallet className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Hodnota"
            value={`€${metrics.totalValue.toLocaleString()}`}
            color="emerald"
          />
          <MetricCard
            icon={<PiggyBank className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Kapitál"
            value={`€${metrics.totalEquity.toLocaleString()}`}
            color="blue"
          />
          <MetricCard
            icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Zhodnotenie"
            value={`${metrics.appreciationPercent >= 0 ? "+" : ""}${metrics.appreciationPercent.toFixed(1)}%`}
            subValue={`€${metrics.totalAppreciation.toLocaleString()}`}
            color={metrics.appreciationPercent >= 0 ? "emerald" : "red"}
          />
          <MetricCard
            icon={<Euro className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Cash flow"
            value={`€${metrics.monthlyCashFlow.toLocaleString()}`}
            subValue={`€${metrics.annualCashFlow.toLocaleString()}/rok`}
            color={metrics.monthlyCashFlow >= 0 ? "emerald" : "red"}
          />
          <MetricCard
            icon={<Percent className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Hrubý výnos"
            value={`${metrics.grossYield.toFixed(1)}%`}
            color="purple"
          />
          <MetricCard
            icon={<BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Čistý výnos"
            value={`${metrics.netYield.toFixed(1)}%`}
            color="yellow"
          />
        </div>
      )}

      {/* Cash Flow Breakdown - Premium */}
      {metrics && metrics.monthlyRentIncome > 0 && (
        <div className="premium-card p-4 lg:p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Mesačný prehľad</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wide">Príjem</span>
              </div>
              <div className="text-base font-semibold text-zinc-100 font-mono">
                €{metrics.monthlyRentIncome.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-1.5 text-red-400 mb-1.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wide">Hypotéky</span>
              </div>
              <div className="text-base font-semibold text-zinc-100 font-mono">
                €{metrics.monthlyMortgagePayments.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-1.5 text-amber-400 mb-1.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wide">Náklady</span>
              </div>
              <div className="text-base font-semibold text-zinc-100 font-mono">
                €{metrics.monthlyExpenses.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
              <div className={`flex items-center gap-1.5 mb-1.5 ${
                metrics.monthlyCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                <Euro className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wide">Čistý CF</span>
              </div>
              <div className={`text-base font-semibold font-mono ${
                metrics.monthlyCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                €{metrics.monthlyCashFlow.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Properties List */}
      {properties.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-6 h-6 text-zinc-600" />
          </div>
          <h3 className="text-base font-medium text-zinc-100 mb-1">Zatiaľ nemáte žiadne nehnuteľnosti</h3>
          <p className="text-sm text-zinc-500 mb-6">
            Pridajte svoju prvú investičnú nehnuteľnosť
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Pridať nehnuteľnosť
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => setSelectedProperty(property)}
            />
          ))}
        </div>
      )}

      {/* Add Property Modal */}
      {showAddModal && (
        <AddPropertyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchPortfolio();
          }}
        />
      )}

      {/* Property Detail Modal */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onUpdate={fetchPortfolio}
          onDelete={() => handleDeleteProperty(selectedProperty.id)}
          onAddTransaction={() => setShowTransactionModal(true)}
        />
      )}

      {/* Add Transaction Modal */}
      {showTransactionModal && selectedProperty && (
        <AddTransactionModal
          propertyId={selectedProperty.id}
          onClose={() => setShowTransactionModal(false)}
          onSuccess={() => {
            setShowTransactionModal(false);
            fetchPortfolio();
          }}
        />
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: "emerald" | "blue" | "purple" | "yellow" | "red";
}) {
  const colorClasses = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    purple: "text-violet-400",
    yellow: "text-amber-400",
    red: "text-red-400",
  };

  return (
    <div className="premium-card p-4">
      <div className={`${colorClasses[color]} mb-2`}>
        {icon}
      </div>
      <div className="text-lg font-semibold text-zinc-100 font-mono">{value}</div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">{label}</div>
      {subValue && <div className="text-xs text-zinc-600 font-mono mt-1">{subValue}</div>}
    </div>
  );
}

function PropertyCard({
  property,
  onClick,
}: {
  property: PortfolioProperty;
  onClick: () => void;
}) {
  const appreciation = property.currentValue - property.purchasePrice;
  const appreciationPercent = (appreciation / property.purchasePrice) * 100;
  const monthlyIncome = property.isRented ? (property.monthlyRent || 0) : 0;
  const monthlyCashFlow = monthlyIncome - property.monthlyExpenses - (property.mortgagePayment || 0);
  const status = STATUS_LABELS[property.status] || STATUS_LABELS.OWNED;

  return (
    <div
      onClick={onClick}
      className="group premium-card-interactive p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-100 group-hover:text-white transition-colors">{property.name}</h3>
          <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
            <MapPin className="w-3 h-3" />
            {property.district ? `${property.district}, ` : ""}{getCityRegionLabel(property.city)}
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-wide">Hodnota</div>
          <div className="text-sm font-semibold text-zinc-100 font-mono">€{property.currentValue.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-wide">Zhodnotenie</div>
          <div className={`text-sm font-semibold font-mono ${appreciationPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {appreciationPercent >= 0 ? "+" : ""}{appreciationPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {property.isRented && (
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-zinc-400 font-mono">€{property.monthlyRent}/mes</span>
          </div>
          <div className={`text-xs font-medium font-mono ${monthlyCashFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            CF: €{monthlyCashFlow.toLocaleString()}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end mt-3 text-zinc-600 group-hover:text-zinc-400 transition-colors">
        <span className="text-xs">Detail</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

function AddPropertyModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "BRATISLAVA",
    district: "",
    propertyType: "apartment",
    area_m2: "",
    rooms: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: "",
    purchaseCosts: "",
    currentValue: "",
    hasMortgage: false,
    mortgageAmount: "",
    mortgageRate: "",
    mortgagePayment: "",
    isRented: false,
    monthlyRent: "",
    monthlyExpenses: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/v1/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          area_m2: parseFloat(formData.area_m2) || 0,
          rooms: formData.rooms ? parseInt(formData.rooms) : null,
          purchasePrice: parseFloat(formData.purchasePrice) || 0,
          purchaseCosts: parseFloat(formData.purchaseCosts) || 0,
          currentValue: parseFloat(formData.currentValue) || parseFloat(formData.purchasePrice) || 0,
          mortgageAmount: formData.hasMortgage ? parseFloat(formData.mortgageAmount) || null : null,
          mortgageRate: formData.hasMortgage ? parseFloat(formData.mortgageRate) || null : null,
          mortgagePayment: formData.hasMortgage ? parseFloat(formData.mortgagePayment) || null : null,
          monthlyRent: formData.isRented ? parseFloat(formData.monthlyRent) || null : null,
          monthlyExpenses: parseFloat(formData.monthlyExpenses) || 0,
        }),
      });

      if (res.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error adding property:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] rounded-xl border border-zinc-800/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between sticky top-0 bg-[#0f0f0f]">
          <h3 className="text-base font-medium text-zinc-100">Pridať nehnuteľnosť</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Basic Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              Základné údaje
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">Názov *</label>
                <input
                  type="text"
                  required
                  placeholder="napr. Byt Petržalka"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">Adresa *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Región *</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                >
                  {REGION_OPTIONS.map((region) => (
                    <option key={region.value} value={region.value}>{region.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Typ</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                >
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Plocha (m²) *</label>
                <input
                  type="number"
                  required
                  value={formData.area_m2}
                  onChange={(e) => setFormData({ ...formData, area_m2: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Počet izieb</label>
                <input
                  type="number"
                  value={formData.rooms}
                  onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Purchase Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
              <Euro className="w-3.5 h-3.5 text-emerald-400" />
              Nákup
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Dátum kúpy *</label>
                <input
                  type="date"
                  required
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Kúpna cena (€) *</label>
                <input
                  type="number"
                  required
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Náklady na kúpu (€)</label>
                <input
                  type="number"
                  placeholder="Právnik, dane, atď."
                  value={formData.purchaseCosts}
                  onChange={(e) => setFormData({ ...formData, purchaseCosts: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Aktuálna hodnota (€)</label>
                <input
                  type="number"
                  placeholder="Odhad"
                  value={formData.currentValue}
                  onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Mortgage */}
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasMortgage}
                onChange={(e) => setFormData({ ...formData, hasMortgage: e.target.checked })}
                className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-emerald-500"
              />
              <span className="font-medium text-zinc-100">Mám hypotéku</span>
            </label>
            {formData.hasMortgage && (
              <div className="grid grid-cols-3 gap-4 pl-8">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Výška (€)</label>
                  <input
                    type="number"
                    value={formData.mortgageAmount}
                    onChange={(e) => setFormData({ ...formData, mortgageAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Úrok (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mortgageRate}
                    onChange={(e) => setFormData({ ...formData, mortgageRate: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Splátka (€/mes)</label>
                  <input
                    type="number"
                    value={formData.mortgagePayment}
                    onChange={(e) => setFormData({ ...formData, mortgagePayment: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rental */}
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRented}
                onChange={(e) => setFormData({ ...formData, isRented: e.target.checked })}
                className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-emerald-500"
              />
              <span className="font-medium text-zinc-100">Prenajímam</span>
            </label>
            {formData.isRented && (
              <div className="grid grid-cols-2 gap-4 pl-8">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Mesačný nájom (€)</label>
                  <input
                    type="number"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Mesačné náklady (€)</label>
                  <input
                    type="number"
                    placeholder="Správa, poistenie, atď."
                    value={formData.monthlyExpenses}
                    onChange={(e) => setFormData({ ...formData, monthlyExpenses: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Poznámky</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Pridať
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PropertyDetailModal({
  property,
  onClose,
  onUpdate,
  onDelete,
  onAddTransaction,
}: {
  property: PortfolioProperty;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onAddTransaction: () => void;
}) {
  const appreciation = property.currentValue - property.purchasePrice;
  const appreciationPercent = (appreciation / property.purchasePrice) * 100;
  const monthlyIncome = property.isRented ? (property.monthlyRent || 0) : 0;
  const monthlyCashFlow = monthlyIncome - property.monthlyExpenses - (property.mortgagePayment || 0);
  const annualCashFlow = monthlyCashFlow * 12;
  const grossYield = property.purchasePrice > 0 ? ((monthlyIncome * 12) / property.purchasePrice) * 100 : 0;
  const netYield = property.purchasePrice > 0 ? (annualCashFlow / property.purchasePrice) * 100 : 0;
  const equity = property.currentValue - (property.mortgageAmount || 0);
  
  const purchaseDate = new Date(property.purchaseDate);
  const holdingDays = Math.floor((Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  const holdingYears = (holdingDays / 365).toFixed(1);

  const status = STATUS_LABELS[property.status] || STATUS_LABELS.OWNED;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] rounded-xl border border-zinc-800/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between sticky top-0 bg-[#0f0f0f]">
          <div>
            <h3 className="text-base font-medium text-zinc-100">{property.name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
              <MapPin className="w-3 h-3" />
              {property.address}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${status.color}`}>
              {status.label}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Hodnota</div>
              <div className="text-base font-semibold text-zinc-100 font-mono">€{property.currentValue.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Zhodnotenie</div>
              <div className={`text-base font-semibold font-mono ${appreciationPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {appreciationPercent >= 0 ? "+" : ""}{appreciationPercent.toFixed(1)}%
              </div>
              <div className="text-xs text-zinc-600 font-mono">€{appreciation.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Kapitál</div>
              <div className="text-base font-semibold text-blue-400 font-mono">€{equity.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Držanie</div>
              <div className="text-base font-semibold text-zinc-100 font-mono">{holdingYears} rokov</div>
            </div>
          </div>

          {/* Cash Flow */}
          {property.isRented && (
            <div className="bg-zinc-900/30 rounded-lg p-4 border border-zinc-800/50">
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Euro className="w-3.5 h-3.5 text-emerald-400" />
                Cash Flow
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Nájom</div>
                  <div className="text-sm font-semibold text-emerald-400 font-mono">€{property.monthlyRent?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Hypotéka</div>
                  <div className="text-sm font-semibold text-red-400 font-mono">-€{property.mortgagePayment?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Náklady</div>
                  <div className="text-sm font-semibold text-red-400 font-mono">-€{property.monthlyExpenses.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Čistý CF</div>
                  <div className={`text-sm font-semibold font-mono ${monthlyCashFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    €{monthlyCashFlow.toLocaleString()}/mes
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-zinc-800/50">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Hrubý výnos</div>
                  <div className="text-sm font-semibold text-violet-400 font-mono">{grossYield.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Čistý výnos</div>
                  <div className="text-sm font-semibold text-amber-400 font-mono">{netYield.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Mortgage */}
          {property.hasMortgage && (
            <div className="bg-zinc-900/30 rounded-lg p-4 border border-zinc-800/50">
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                Hypotéka
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Zostatok</div>
                  <div className="text-sm font-semibold text-zinc-100 font-mono">€{property.mortgageAmount?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Úrok</div>
                  <div className="text-sm font-semibold text-zinc-100 font-mono">{property.mortgageRate}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Splátka</div>
                  <div className="text-sm font-semibold text-zinc-100 font-mono">€{property.mortgagePayment?.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="bg-zinc-900/30 rounded-lg p-4 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                Transakcie
              </h4>
              <button
                onClick={onAddTransaction}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Pridať
              </button>
            </div>
            {property.transactions.length === 0 ? (
              <p className="text-zinc-600 text-xs">Žiadne transakcie</p>
            ) : (
              <div className="space-y-1">
                {property.transactions.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                    <div>
                      <div className="text-xs text-zinc-300">{t.description || t.type}</div>
                      <div className="text-[10px] text-zinc-600">{new Date(t.date).toLocaleDateString("sk-SK")}</div>
                    </div>
                    <div className={`text-xs font-medium font-mono ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {t.amount >= 0 ? "+" : ""}€{t.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {property.notes && (
            <div className="bg-zinc-900/30 rounded-lg p-4 border border-zinc-800/50">
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Poznámky</h4>
              <p className="text-zinc-500 text-xs">{property.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-zinc-800/50">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Vymazať
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              Zavrieť
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddTransactionModal({
  propertyId,
  onClose,
  onSuccess,
}: {
  propertyId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "RENT_INCOME",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const transactionTypes = [
    { value: "RENT_INCOME", label: "Príjem z nájmu", isIncome: true },
    { value: "OTHER_INCOME", label: "Iný príjem", isIncome: true },
    { value: "MAINTENANCE", label: "Údržba", isIncome: false },
    { value: "RENOVATION", label: "Rekonštrukcia", isIncome: false },
    { value: "TAX", label: "Daň z nehnuteľnosti", isIncome: false },
    { value: "INSURANCE", label: "Poistenie", isIncome: false },
    { value: "MORTGAGE_PAYMENT", label: "Splátka hypotéky", isIncome: false },
    { value: "UTILITIES", label: "Energie", isIncome: false },
    { value: "MANAGEMENT_FEE", label: "Správa nehnuteľnosti", isIncome: false },
    { value: "OTHER_EXPENSE", label: "Iný výdavok", isIncome: false },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/portfolio/${propertyId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount) || 0,
        }),
      });

      if (res.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] rounded-xl border border-zinc-800/50 w-full max-w-md">
        <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between">
          <h3 className="text-base font-medium text-zinc-100">Pridať transakciu</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Typ transakcie</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
            >
              <optgroup label="Príjmy">
                {transactionTypes.filter((t) => t.isIncome).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
              <optgroup label="Výdavky">
                {transactionTypes.filter((t) => !t.isIncome).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Suma (€)</label>
            <input
              type="number"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Dátum</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Popis</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Pridať
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
