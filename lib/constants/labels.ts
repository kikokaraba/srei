/**
 * Centralizované labels pre celú aplikáciu
 * Použitie: import { CITY_LABELS, CONDITION_LABELS, ... } from "@/lib/constants/labels";
 */

// ==========================================
// MESTÁ
// ==========================================

export const CITY_LABELS: Record<string, string> = {
  BRATISLAVA: "Bratislava",
  KOSICE: "Košice",
  PRESOV: "Prešov",
  ZILINA: "Žilina",
  BANSKA_BYSTRICA: "Banská Bystrica",
  TRNAVA: "Trnava",
  TRENCIN: "Trenčín",
  NITRA: "Nitra",
} as const;

// Pre selecty a dropdowny
export const CITY_OPTIONS = Object.entries(CITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// ==========================================
// STAV NEHNUTEĽNOSTI
// ==========================================

export const CONDITION_LABELS: Record<string, string> = {
  POVODNY: "Pôvodný stav",
  REKONSTRUKCIA: "Po rekonštrukcii",
  NOVOSTAVBA: "Novostavba",
} as const;

export const CONDITION_OPTIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// ==========================================
// ENERGETICKÉ CERTIFIKÁTY
// ==========================================

export const ENERGY_CERTIFICATE_LABELS: Record<string, string> = {
  A: "A (najúspornejší)",
  B: "B",
  C: "C",
  D: "D",
  E: "E",
  F: "F",
  G: "G (najmenej úsporný)",
  NONE: "Bez certifikátu",
} as const;

export const ENERGY_CERTIFICATE_OPTIONS = Object.entries(ENERGY_CERTIFICATE_LABELS).map(
  ([value, label]) => ({ value, label })
);

// ==========================================
// POUŽÍVATEĽSKÉ ROLE
// ==========================================

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  PREMIUM_INVESTOR: "Premium Investor",
  FREE_USER: "Free",
} as const;

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// ==========================================
// PORTFÓLIO STATUS
// ==========================================

export const PORTFOLIO_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OWNED: { label: "Vlastnená", color: "bg-blue-500/20 text-blue-400" },
  SOLD: { label: "Predaná", color: "bg-slate-500/20 text-slate-400" },
  RENTED: { label: "Prenajatá", color: "bg-emerald-500/20 text-emerald-400" },
  VACANT: { label: "Prázdna", color: "bg-yellow-500/20 text-yellow-400" },
  RENOVATING: { label: "V rekonštrukcii", color: "bg-purple-500/20 text-purple-400" },
} as const;

// ==========================================
// TYPY NEHNUTEĽNOSTÍ
// ==========================================

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Byt",
  house: "Dom",
  studio: "Garsónka",
  commercial: "Komerčný priestor",
  land: "Pozemok",
} as const;

export const PROPERTY_TYPE_OPTIONS = Object.entries(PROPERTY_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

// ==========================================
// TYPY TRANSAKCIÍ
// ==========================================

export const TRANSACTION_TYPE_LABELS: Record<string, { label: string; isIncome: boolean }> = {
  PURCHASE: { label: "Kúpa", isIncome: false },
  SALE: { label: "Predaj", isIncome: true },
  RENT_INCOME: { label: "Príjem z nájmu", isIncome: true },
  MAINTENANCE: { label: "Údržba", isIncome: false },
  RENOVATION: { label: "Rekonštrukcia", isIncome: false },
  TAX: { label: "Daň z nehnuteľnosti", isIncome: false },
  INSURANCE: { label: "Poistenie", isIncome: false },
  MORTGAGE_PAYMENT: { label: "Splátka hypotéky", isIncome: false },
  UTILITIES: { label: "Energie", isIncome: false },
  MANAGEMENT_FEE: { label: "Správa nehnuteľnosti", isIncome: false },
  OTHER_INCOME: { label: "Iný príjem", isIncome: true },
  OTHER_EXPENSE: { label: "Iný výdavok", isIncome: false },
} as const;

// ==========================================
// TYPY INVESTÍCIÍ
// ==========================================

export const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  "future-potential": "Budúci potenciál",
  "high-yield": "Vysoký výnos",
  "stable-growth": "Stabilný rast",
  flip: "Flip (rýchly predaj)",
  rental: "Prenájom",
} as const;

export const INVESTMENT_TYPE_OPTIONS = Object.entries(INVESTMENT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

// ==========================================
// INFRAŠTRUKTÚRA
// ==========================================

export const INFRASTRUCTURE_TYPE_LABELS: Record<string, string> = {
  METRO_STATION: "Stanica metra",
  TRAM_STATION: "Zastávka električky",
  HIGHWAY: "Diaľnica",
  SHOPPING_CENTER: "Obchodné centrum",
  SCHOOL: "Škola",
  HOSPITAL: "Nemocnica",
  PARK: "Park",
  BUSINESS_DISTRICT: "Obchodná zóna",
} as const;

// ==========================================
// HELPER FUNKCIE
// ==========================================

/**
 * Získa label pre mesto, s fallbackom na hodnotu
 */
export function getCityLabel(city: string): string {
  return CITY_LABELS[city] || city;
}

/**
 * Získa label pre stav nehnuteľnosti
 */
export function getConditionLabel(condition: string): string {
  return CONDITION_LABELS[condition] || condition;
}

/**
 * Získa label pre rolu
 */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}
