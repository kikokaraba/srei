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

const CITY_LABELS: Record<string, string> = {
  BRATISLAVA: "Bratislava",
  KOSICE: "Košice",
  PRESOV: "Prešov",
  ZILINA: "Žilina",
  BANSKA_BYSTRICA: "B. Bystrica",
  TRNAVA: "Trnava",
  TRENCIN: "Trenčín",
  NITRA: "Nitra",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Byt",
  house: "Dom",
  studio: "Garsónka",
  commercial: "Komerčný priestor",
  land: "Pozemok",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OWNED: { label: "Vlastnená", color: "bg-blue-500/20 text-blue-400" },
  SOLD: { label: "Predaná", color: "bg-slate-500/20 text-slate-400" },
  RENTED: { label: "Prenajatá", color: "bg-emerald-500/20 text-emerald-400" },
  VACANT: { label: "Prázdna", color: "bg-yellow-500/20 text-yellow-400" },
  RENOVATING: { label: "V rekonštrukcii", color: "bg-purple-500/20 text-purple-400" },
};

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-emerald-400" />
            Moje portfólio
          </h2>
          <p className="text-slate-400 mt-1">
            Spravujte svoje investičné nehnuteľnosti a sledujte výnosy
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Pridať nehnuteľnosť
        </button>
      </div>

      {/* Portfolio Overview */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard
            icon={<Wallet className="w-5 h-5" />}
            label="Hodnota portfólia"
            value={`€${metrics.totalValue.toLocaleString()}`}
            color="emerald"
          />
          <MetricCard
            icon={<PiggyBank className="w-5 h-5" />}
            label="Celkový kapitál"
            value={`€${metrics.totalEquity.toLocaleString()}`}
            color="blue"
          />
          <MetricCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Zhodnotenie"
            value={`${metrics.appreciationPercent >= 0 ? "+" : ""}${metrics.appreciationPercent.toFixed(1)}%`}
            subValue={`€${metrics.totalAppreciation.toLocaleString()}`}
            color={metrics.appreciationPercent >= 0 ? "emerald" : "red"}
          />
          <MetricCard
            icon={<Euro className="w-5 h-5" />}
            label="Mesačný cash flow"
            value={`€${metrics.monthlyCashFlow.toLocaleString()}`}
            subValue={`€${metrics.annualCashFlow.toLocaleString()}/rok`}
            color={metrics.monthlyCashFlow >= 0 ? "emerald" : "red"}
          />
          <MetricCard
            icon={<Percent className="w-5 h-5" />}
            label="Hrubý výnos"
            value={`${metrics.grossYield.toFixed(1)}%`}
            color="purple"
          />
          <MetricCard
            icon={<BarChart3 className="w-5 h-5" />}
            label="Čistý výnos"
            value={`${metrics.netYield.toFixed(1)}%`}
            color="yellow"
          />
        </div>
      )}

      {/* Cash Flow Breakdown */}
      {metrics && metrics.monthlyRentIncome > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="font-semibold text-slate-100 mb-4">Mesačný prehľad</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm">Príjem z nájmu</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                €{metrics.monthlyRentIncome.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <ArrowDownRight className="w-4 h-4" />
                <span className="text-sm">Splátky hypoték</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                €{metrics.monthlyMortgagePayments.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <ArrowDownRight className="w-4 h-4" />
                <span className="text-sm">Prevádzkové náklady</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                €{metrics.monthlyExpenses.toLocaleString()}
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${
              metrics.monthlyCashFlow >= 0
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}>
              <div className={`flex items-center gap-2 mb-2 ${
                metrics.monthlyCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                <Euro className="w-4 h-4" />
                <span className="text-sm">Čistý cash flow</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                €{metrics.monthlyCashFlow.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Properties List */}
      {properties.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
          <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-100 mb-2">Zatiaľ nemáte žiadne nehnuteľnosti</h3>
          <p className="text-slate-400 mb-6">
            Pridajte svoju prvú investičnú nehnuteľnosť a začnite sledovať výnosy
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
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
    emerald: "text-emerald-400 bg-emerald-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    red: "text-red-400 bg-red-500/10",
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
      {subValue && <div className="text-xs text-slate-500 mt-1">{subValue}</div>}
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
      className="bg-slate-900 rounded-xl border border-slate-800 p-5 hover:border-slate-700 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-100">{property.name}</h3>
          <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
            <MapPin className="w-3 h-3" />
            {property.district ? `${property.district}, ` : ""}{CITY_LABELS[property.city] || property.city}
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-slate-500">Aktuálna hodnota</div>
          <div className="font-bold text-slate-100">€{property.currentValue.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Zhodnotenie</div>
          <div className={`font-bold ${appreciationPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {appreciationPercent >= 0 ? "+" : ""}{appreciationPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {property.isRented && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-300">€{property.monthlyRent}/mes</span>
          </div>
          <div className={`text-sm font-medium ${monthlyCashFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            Cash flow: €{monthlyCashFlow.toLocaleString()}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end mt-4 text-slate-400">
        <span className="text-sm">Detail</span>
        <ChevronRight className="w-4 h-4" />
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900">
          <h3 className="font-bold text-slate-100 text-lg">Pridať nehnuteľnosť do portfólia</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-100 flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-400" />
              Základné údaje
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-slate-400 mb-1">Názov *</label>
                <input
                  type="text"
                  required
                  placeholder="napr. Byt Petržalka"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-slate-400 mb-1">Adresa *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Mesto *</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                >
                  {Object.entries(CITY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Typ</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                >
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Plocha (m²) *</label>
                <input
                  type="number"
                  required
                  value={formData.area_m2}
                  onChange={(e) => setFormData({ ...formData, area_m2: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Počet izieb</label>
                <input
                  type="number"
                  value={formData.rooms}
                  onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Purchase Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-100 flex items-center gap-2">
              <Euro className="w-4 h-4 text-emerald-400" />
              Nákup
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Dátum kúpy *</label>
                <input
                  type="date"
                  required
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Kúpna cena (€) *</label>
                <input
                  type="number"
                  required
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Náklady na kúpu (€)</label>
                <input
                  type="number"
                  placeholder="Právnik, dane, atď."
                  value={formData.purchaseCosts}
                  onChange={(e) => setFormData({ ...formData, purchaseCosts: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Aktuálna hodnota (€)</label>
                <input
                  type="number"
                  placeholder="Odhad"
                  value={formData.currentValue}
                  onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
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
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500"
              />
              <span className="font-medium text-slate-100">Mám hypotéku</span>
            </label>
            {formData.hasMortgage && (
              <div className="grid grid-cols-3 gap-4 pl-8">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Výška (€)</label>
                  <input
                    type="number"
                    value={formData.mortgageAmount}
                    onChange={(e) => setFormData({ ...formData, mortgageAmount: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Úrok (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mortgageRate}
                    onChange={(e) => setFormData({ ...formData, mortgageRate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Splátka (€/mes)</label>
                  <input
                    type="number"
                    value={formData.mortgagePayment}
                    onChange={(e) => setFormData({ ...formData, mortgagePayment: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
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
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500"
              />
              <span className="font-medium text-slate-100">Prenajímam</span>
            </label>
            {formData.isRented && (
              <div className="grid grid-cols-2 gap-4 pl-8">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Mesačný nájom (€)</label>
                  <input
                    type="number"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Mesačné náklady (€)</label>
                  <input
                    type="number"
                    placeholder="Správa, poistenie, atď."
                    value={formData.monthlyExpenses}
                    onChange={(e) => setFormData({ ...formData, monthlyExpenses: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Poznámky</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900">
          <div>
            <h3 className="font-bold text-slate-100 text-lg">{property.name}</h3>
            <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
              <MapPin className="w-3 h-3" />
              {property.address}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="text-sm text-slate-400">Aktuálna hodnota</div>
              <div className="text-xl font-bold text-slate-100">€{property.currentValue.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="text-sm text-slate-400">Zhodnotenie</div>
              <div className={`text-xl font-bold ${appreciationPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {appreciationPercent >= 0 ? "+" : ""}{appreciationPercent.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">€{appreciation.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="text-sm text-slate-400">Vlastný kapitál</div>
              <div className="text-xl font-bold text-blue-400">€{equity.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="text-sm text-slate-400">Doba držania</div>
              <div className="text-xl font-bold text-slate-100">{holdingYears} rokov</div>
            </div>
          </div>

          {/* Cash Flow */}
          {property.isRented && (
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
              <h4 className="font-medium text-slate-100 mb-4 flex items-center gap-2">
                <Euro className="w-4 h-4 text-emerald-400" />
                Cash Flow
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-slate-400">Mesačný nájom</div>
                  <div className="font-bold text-emerald-400">€{property.monthlyRent?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Splátka hypotéky</div>
                  <div className="font-bold text-red-400">-€{property.mortgagePayment?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Náklady</div>
                  <div className="font-bold text-red-400">-€{property.monthlyExpenses.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Čistý cash flow</div>
                  <div className={`font-bold ${monthlyCashFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    €{monthlyCashFlow.toLocaleString()}/mes
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700">
                <div>
                  <div className="text-sm text-slate-400">Hrubý výnos</div>
                  <div className="font-bold text-purple-400">{grossYield.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Čistý výnos</div>
                  <div className="font-bold text-yellow-400">{netYield.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Mortgage */}
          {property.hasMortgage && (
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
              <h4 className="font-medium text-slate-100 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                Hypotéka
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-slate-400">Zostatok</div>
                  <div className="font-bold text-slate-100">€{property.mortgageAmount?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Úroková sadzba</div>
                  <div className="font-bold text-slate-100">{property.mortgageRate}%</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Mesačná splátka</div>
                  <div className="font-bold text-slate-100">€{property.mortgagePayment?.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-yellow-400" />
                Posledné transakcie
              </h4>
              <button
                onClick={onAddTransaction}
                className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="w-4 h-4" />
                Pridať
              </button>
            </div>
            {property.transactions.length === 0 ? (
              <p className="text-slate-500 text-sm">Žiadne transakcie</p>
            ) : (
              <div className="space-y-2">
                {property.transactions.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                    <div>
                      <div className="text-sm text-slate-100">{t.description || t.type}</div>
                      <div className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString("sk-SK")}</div>
                    </div>
                    <div className={`font-medium ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {t.amount >= 0 ? "+" : ""}€{t.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {property.notes && (
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
              <h4 className="font-medium text-slate-100 mb-2">Poznámky</h4>
              <p className="text-slate-400 text-sm">{property.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Vymazať
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-md">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-100">Pridať transakciu</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Typ transakcie</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
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
            <label className="block text-sm text-slate-400 mb-1">Suma (€)</label>
            <input
              type="number"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Dátum</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Popis</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Pridať
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
