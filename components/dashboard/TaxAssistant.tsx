"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  Building,
  User,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface TaxInputs {
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  saleDate: string;
  ownershipType: "individual" | "sro";
  investmentCosts: number;
  wasInBusinessAssets: boolean;
  removedFromAssetsDate: string;
  acquiredByInheritance: boolean;
  inheritanceDirectLine: boolean;
  originalOwnerPurchaseDate: string;
}

interface TaxResults {
  daysOwned: number;
  yearsOwned: number;
  isExempt: boolean;
  exemptionDate: string;
  daysUntilExemption: number;
  capitalGain: number;
  taxableGain: number;
  taxRate: number;
  taxAmount: number;
  netProfit: number;
  healthInsurance: number;
  totalDeductions: number;
  effectiveTaxRate: number;
  exemptionReason: string;
  taxBreakdown: { label: string; amount: number; rate: number }[];
}

const TAX_THRESHOLDS_2026 = {
  firstThreshold: 50234,
};

const TAX_RATE_INDIVIDUAL_LOW = 19;
const TAX_RATE_INDIVIDUAL_HIGH = 25;
const TAX_RATE_SRO = 21;
const HEALTH_INSURANCE_RATE = 15;

export function TaxAssistant() {
  const [inputs, setInputs] = useState<TaxInputs>({
    purchaseDate: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    purchasePrice: 120000,
    currentValue: 155000,
    saleDate: new Date().toISOString().split("T")[0],
    ownershipType: "individual",
    investmentCosts: 8000,
    wasInBusinessAssets: false,
    removedFromAssetsDate: "",
    acquiredByInheritance: false,
    inheritanceDirectLine: true,
    originalOwnerPurchaseDate: "",
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const results = useMemo<TaxResults>(() => calculateTax(inputs), [inputs]);

  const handleChange = (field: keyof TaxInputs, value: string | number | boolean) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const progressPercent = Math.min(100, (results.yearsOwned / 5) * 100);

  return (
    <div className="space-y-6">
      {/* Hero Status Card */}
      <div className={`relative p-6 rounded-2xl border overflow-hidden ${
        results.isExempt 
          ? "bg-emerald-950/30 border-emerald-500/20" 
          : results.daysUntilExemption < 365 
            ? "bg-amber-950/30 border-amber-500/20" 
            : "bg-zinc-800/30 border-zinc-700/50"
      }`}>
        {/* Background glow */}
        {results.isExempt && (
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        )}

        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Status & Progress */}
          <div className="lg:w-56 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              {results.isExempt ? (
                <>
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Oslobodené</span>
                </>
              ) : results.daysUntilExemption < 365 ? (
                <>
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                    {Math.ceil(results.daysUntilExemption / 30)} mes. do oslobodenia
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Podlieha dani</span>
                </>
              )}
            </div>
            
            {/* Years owned display */}
            <div className="flex items-baseline gap-1 mb-3">
              <span className={`text-4xl font-light tabular-nums ${
                results.isExempt ? "text-emerald-400" : results.daysUntilExemption < 365 ? "text-amber-400" : "text-zinc-300"
              }`}>
                {results.yearsOwned.toFixed(1)}
              </span>
              <span className="text-lg text-zinc-600">/ 5 rokov</span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  results.isExempt ? "bg-emerald-500" : results.daysUntilExemption < 365 ? "bg-amber-500" : "bg-zinc-600"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
            <TaxMetric 
              label="Kapitálový zisk" 
              value={`€${results.capitalGain.toLocaleString()}`}
            />
            <TaxMetric 
              label="Daň + odvody" 
              value={`€${results.taxAmount.toLocaleString()}`}
              status={results.isExempt ? "good" : "bad"}
            />
            <TaxMetric 
              label="Čistý zisk" 
              value={`€${results.netProfit.toLocaleString()}`}
              status="good"
            />
            <TaxMetric 
              label="Efektívna sadzba" 
              value={`${results.effectiveTaxRate.toFixed(1)}%`}
            />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs Column */}
        <div className="space-y-4">
          {/* Ownership Type */}
          <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Typ vlastníctva</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleChange("ownershipType", "individual")}
                className={`p-3 rounded-lg border transition-all flex items-center gap-2 ${
                  inputs.ownershipType === "individual"
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                }`}
              >
                <User className="w-4 h-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Fyzická osoba</div>
                  <div className="text-[10px] opacity-70">19-25% + 15% ZP</div>
                </div>
              </button>
              <button
                onClick={() => handleChange("ownershipType", "sro")}
                className={`p-3 rounded-lg border transition-all flex items-center gap-2 ${
                  inputs.ownershipType === "sro"
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                }`}
              >
                <Building className="w-4 h-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">s.r.o.</div>
                  <div className="text-[10px] opacity-70">21% daň PO</div>
                </div>
              </button>
            </div>
          </div>

          {/* Dates & Prices */}
          <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Dátum nadobudnutia"
                type="date"
                value={inputs.purchaseDate}
                onChange={(v) => handleChange("purchaseDate", v)}
              />
              <InputField
                label="Dátum predaja"
                type="date"
                value={inputs.saleDate}
                onChange={(v) => handleChange("saleDate", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Nadobúdacia cena"
                type="number"
                value={inputs.purchasePrice}
                onChange={(v) => handleChange("purchasePrice", Number(v))}
                prefix="€"
              />
              <InputField
                label="Predajná cena"
                type="number"
                value={inputs.currentValue}
                onChange={(v) => handleChange("currentValue", Number(v))}
                prefix="€"
              />
            </div>
            <InputField
              label="Preukázateľné výdavky"
              type="number"
              value={inputs.investmentCosts}
              onChange={(v) => handleChange("investmentCosts", Number(v))}
              prefix="€"
              sublabel="Rekonštrukcia, právnik, realitka"
            />
          </div>

          {/* Advanced Options */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-3 rounded-xl bg-zinc-800/20 border border-zinc-800/50 flex items-center justify-between text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            <span>Rozšírené možnosti</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.wasInBusinessAssets}
                  onChange={(e) => handleChange("wasInBusinessAssets", e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-500"
                />
                <div>
                  <span className="text-sm text-zinc-300">Bola v obchodnom majetku</span>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Oslobodenie nastáva až 5 rokov od vyradenia
                  </p>
                </div>
              </label>

              {inputs.wasInBusinessAssets && (
                <div className="ml-7">
                  <InputField
                    label="Dátum vyradenia"
                    type="date"
                    value={inputs.removedFromAssetsDate}
                    onChange={(v) => handleChange("removedFromAssetsDate", v)}
                  />
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.acquiredByInheritance}
                  onChange={(e) => handleChange("acquiredByInheritance", e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-500"
                />
                <div>
                  <span className="text-sm text-zinc-300">Nadobudnutá dedením</span>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    V priamom rade sa započítava doba poručiteľa
                  </p>
                </div>
              </label>

              {inputs.acquiredByInheritance && (
                <div className="ml-7 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.inheritanceDirectLine}
                      onChange={(e) => handleChange("inheritanceDirectLine", e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-500"
                    />
                    <span className="text-sm text-zinc-400">Dedenie v priamom rade</span>
                  </label>
                  {inputs.inheritanceDirectLine && (
                    <InputField
                      label="Kedy poručiteľ nadobudol"
                      type="date"
                      value={inputs.originalOwnerPurchaseDate}
                      onChange={(v) => handleChange("originalOwnerPurchaseDate", v)}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Column */}
        <div className="space-y-4">
          {/* Tax Breakdown */}
          <div className="p-5 rounded-xl bg-zinc-800/20 border border-zinc-800/50">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Výpočet dane 2026</div>
            <div className="space-y-3">
              <TaxRow label="Predajná cena" value={inputs.currentValue} />
              <TaxRow label="Nadobúdacia cena" value={-inputs.purchasePrice} />
              <TaxRow label="Výdavky" value={-inputs.investmentCosts} />
              <div className="pt-3 mt-3 border-t border-zinc-800">
                <TaxRow label="Základ dane" value={results.taxableGain} bold />
              </div>

              {!results.isExempt && results.taxableGain > 0 && (
                <>
                  {results.taxBreakdown.map((item, idx) => (
                    <TaxRow 
                      key={idx} 
                      label={`${item.label} (${item.rate}%)`} 
                      value={-item.amount} 
                    />
                  ))}
                </>
              )}

              <div className="pt-3 mt-3 border-t border-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white">Čistý zisk</span>
                  <span className="text-2xl font-light text-emerald-400">
                    €{results.netProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Exemption conditions */}
          <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-zinc-500" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Podmienky oslobodenia</span>
            </div>
            <div className="space-y-2 text-sm">
              <ExemptionItem 
                met={results.yearsOwned >= 5} 
                text="5 rokov od nadobudnutia" 
              />
              <ExemptionItem 
                met={false} 
                text="Dedenie v priamom rade (započíta sa)" 
                neutral 
              />
              <ExemptionItem 
                met={false} 
                text="Obchodný majetok: 5 rokov od vyradenia" 
                neutral 
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Časová os</div>
            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-zinc-800" />
              
              {inputs.acquiredByInheritance && inputs.inheritanceDirectLine && inputs.originalOwnerPurchaseDate && (
                <TimelineItem 
                  date={inputs.originalOwnerPurchaseDate} 
                  label="Nadobudnutie poručiteľom" 
                  color="violet" 
                />
              )}
              <TimelineItem 
                date={inputs.purchaseDate} 
                label={inputs.acquiredByInheritance ? "Dedenie" : "Kúpa"} 
                color="blue" 
              />
              <TimelineItem 
                date={inputs.saleDate} 
                label="Plánovaný predaj" 
                color={results.isExempt ? "emerald" : "slate"} 
              />
              {!results.isExempt && (
                <TimelineItem 
                  date={results.exemptionDate} 
                  label="Oslobodenie" 
                  color="amber" 
                  icon={<Shield className="w-3 h-3" />}
                />
              )}
            </div>
          </div>

          {/* Tips */}
          {!results.isExempt && results.daysUntilExemption < 365 && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="text-amber-400 font-medium">Tip:</span>
                  <span className="text-zinc-400 ml-1">
                    Počkajte {Math.ceil(results.daysUntilExemption / 30)} mesiacov a ušetríte{" "}
                    <span className="text-emerald-400 font-medium">€{results.totalDeductions.toLocaleString()}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function TaxMetric({ label, value, status }: { label: string; value: string; status?: "good" | "bad" }) {
  return (
    <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-medium ${
        status === "good" ? "text-emerald-400" : status === "bad" ? "text-red-400" : "text-zinc-300"
      }`}>
        {value}
      </div>
    </div>
  );
}

function InputField({ 
  label, 
  type, 
  value, 
  onChange, 
  prefix, 
  sublabel 
}: { 
  label: string; 
  type: string; 
  value: string | number; 
  onChange: (v: string) => void; 
  prefix?: string;
  sublabel?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1.5">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">{prefix}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50 ${
            prefix ? "pl-7" : ""
          }`}
        />
      </div>
      {sublabel && <p className="text-[10px] text-zinc-600 mt-1">{sublabel}</p>}
    </div>
  );
}

function TaxRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  const isNegative = value < 0;
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? "text-white font-medium" : "text-zinc-500"}`}>{label}</span>
      <span className={`text-sm font-medium tabular-nums ${
        bold ? "text-white" : isNegative ? "text-red-400/80" : "text-zinc-400"
      }`}>
        {isNegative ? "-" : ""}€{Math.abs(value).toLocaleString()}
      </span>
    </div>
  );
}

function ExemptionItem({ met, text, neutral }: { met: boolean; text: string; neutral?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <div className={`w-3.5 h-3.5 rounded-full border ${neutral ? "border-zinc-700" : "border-zinc-600"}`} />
      )}
      <span className={met ? "text-zinc-300" : "text-zinc-600"}>{text}</span>
    </div>
  );
}

function TimelineItem({ 
  date, 
  label, 
  color, 
  icon 
}: { 
  date: string; 
  label: string; 
  color: "violet" | "blue" | "emerald" | "amber" | "slate";
  icon?: React.ReactNode;
}) {
  const colors = {
    violet: "bg-violet-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    slate: "bg-zinc-600",
  };

  return (
    <div className="relative flex items-center gap-3 pb-4 last:pb-0">
      <div className={`w-2 h-2 rounded-full ${colors[color]} -ml-[5px] z-10`} />
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="text-xs text-zinc-600">{new Date(date).toLocaleDateString("sk-SK")}</span>
      </div>
    </div>
  );
}

function calculateTax(inputs: TaxInputs): TaxResults {
  const purchaseDate = new Date(inputs.purchaseDate);
  const saleDate = new Date(inputs.saleDate);
  
  // Determine effective purchase date for exemption calculation
  let effectivePurchaseDate = purchaseDate;
  let exemptionReason = "";
  
  // If inherited in direct line, use original owner's purchase date
  if (inputs.acquiredByInheritance && inputs.inheritanceDirectLine && inputs.originalOwnerPurchaseDate) {
    effectivePurchaseDate = new Date(inputs.originalOwnerPurchaseDate);
  }
  
  // If was in business assets, use removal date
  if (inputs.wasInBusinessAssets && inputs.removedFromAssetsDate) {
    effectivePurchaseDate = new Date(inputs.removedFromAssetsDate);
  }
  
  // Days owned (for display, use actual ownership)
  const daysOwned = Math.floor((saleDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  const yearsOwned = daysOwned / 365;
  
  // Days for exemption calculation
  const daysForExemption = Math.floor((saleDate.getTime() - effectivePurchaseDate.getTime()) / (1000 * 60 * 60 * 24));

  // Exemption date (5 years from effective purchase)
  const exemptionDate = new Date(effectivePurchaseDate);
  exemptionDate.setFullYear(exemptionDate.getFullYear() + 5);

  // Is exempt? (5 years rule - § 9 ods. 1 písm. a)
  const isExempt = daysForExemption >= 5 * 365;
  
  if (isExempt) {
    if (inputs.wasInBusinessAssets) {
      exemptionReason = "Uplynulo 5 rokov od vyradenia z obchodného majetku";
    } else if (inputs.acquiredByInheritance && inputs.inheritanceDirectLine) {
      exemptionReason = "Uplynulo 5 rokov od nadobudnutia poručiteľom (dedenie v priamom rade)";
    } else {
      exemptionReason = "Uplynulo 5 rokov od nadobudnutia nehnuteľnosti";
    }
  }
  
  const daysUntilExemption = Math.max(0, Math.floor((exemptionDate.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Capital gain
  const capitalGain = inputs.currentValue - inputs.purchasePrice;
  const taxableGain = Math.max(0, capitalGain - inputs.investmentCosts);

  // Tax calculation
  let taxAmount = 0;
  let healthInsurance = 0;
  const taxBreakdown: { label: string; amount: number; rate: number }[] = [];

  if (!isExempt && taxableGain > 0) {
    if (inputs.ownershipType === "sro") {
      // s.r.o. - flat 21% corporate tax
      taxAmount = Math.round(taxableGain * TAX_RATE_SRO / 100);
      taxBreakdown.push({
        label: "Daň z príjmu PO",
        amount: taxAmount,
        rate: TAX_RATE_SRO,
      });
    } else {
      // Individual - progressive tax + health insurance
      // For "other income" (§ 8), progressive rates apply
      if (taxableGain <= TAX_THRESHOLDS_2026.firstThreshold) {
        // All at 19%
        taxAmount = Math.round(taxableGain * TAX_RATE_INDIVIDUAL_LOW / 100);
        taxBreakdown.push({
          label: "Daň z príjmu (do €50 234)",
          amount: taxAmount,
          rate: TAX_RATE_INDIVIDUAL_LOW,
        });
      } else {
        // Split: 19% on first threshold, 25% on rest
        const taxLow = Math.round(TAX_THRESHOLDS_2026.firstThreshold * TAX_RATE_INDIVIDUAL_LOW / 100);
        const taxHigh = Math.round((taxableGain - TAX_THRESHOLDS_2026.firstThreshold) * TAX_RATE_INDIVIDUAL_HIGH / 100);
        taxAmount = taxLow + taxHigh;
        
        taxBreakdown.push({
          label: "Daň z príjmu 19% (do €50 234)",
          amount: taxLow,
          rate: TAX_RATE_INDIVIDUAL_LOW,
        });
        taxBreakdown.push({
          label: "Daň z príjmu 25% (nad €50 234)",
          amount: taxHigh,
          rate: TAX_RATE_INDIVIDUAL_HIGH,
        });
      }
      
      // Health insurance (15% for capital gains)
      // Only for individuals, calculated from taxable gain
      healthInsurance = Math.round(taxableGain * HEALTH_INSURANCE_RATE / 100);
      taxBreakdown.push({
        label: "Zdravotné poistenie",
        amount: healthInsurance,
        rate: HEALTH_INSURANCE_RATE,
      });
    }
  }

  const totalDeductions = taxAmount + healthInsurance;
  const netProfit = capitalGain - totalDeductions;
  const effectiveTaxRate = capitalGain > 0 ? (totalDeductions / capitalGain) * 100 : 0;

  return {
    daysOwned,
    yearsOwned,
    isExempt,
    exemptionDate: exemptionDate.toISOString(),
    daysUntilExemption,
    capitalGain,
    taxableGain,
    taxRate: inputs.ownershipType === "sro" ? TAX_RATE_SRO : TAX_RATE_INDIVIDUAL_LOW,
    taxAmount: totalDeductions, // Include health insurance in total
    netProfit,
    healthInsurance,
    totalDeductions,
    effectiveTaxRate,
    exemptionReason,
    taxBreakdown,
  };
}
