/**
 * Centralizovaná knižnica investičných vzorcov pre slovenský realitný trh
 * 
 * Tieto funkcie môžu byť použité v:
 * - Kalkulačkách
 * - Detail nehnuteľnosti
 * - Automatických výpočtoch pri importe dát
 */

// ============================================
// TYPY
// ============================================

export interface YieldInputs {
  purchasePrice: number;
  monthlyRent: number;
  monthlyExpenses: number; // fond opráv, správa, energie, poistenie
  vacancyRatePercent: number; // % času bez nájomníka
}

export interface YieldResults {
  grossYield: number; // Hrubý výnos (%)
  netYield: number; // Čistý výnos (%)
  annualGrossIncome: number;
  annualNetIncome: number;
  effectiveMonthlyRent: number; // Po odpočítaní vacancy
}

export interface MortgageInputs {
  loanAmount: number;
  annualInterestRate: number; // v percentách
  loanTermYears: number;
}

export interface MortgageResults {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  amortizationSchedule: AmortizationRow[];
}

export interface AmortizationRow {
  year: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

export interface CashFlowInputs extends YieldInputs {
  mortgagePayment: number;
}

export interface CashFlowResults {
  monthlyCashFlow: number;
  annualCashFlow: number;
  isPositive: boolean;
  breakEvenRent: number; // Minimálny nájom na pokrytie nákladov
}

export interface CashOnCashInputs {
  annualCashFlow: number;
  totalCashInvested: number; // Záloha + náklady na kúpu + rekonštrukcia
}

export interface BRRRRInputs {
  purchasePrice: number;
  purchaseCosts: number; // Notár, daň, realitka
  renovationCost: number;
  afterRepairValue: number; // ARV
  refinanceLTV: number; // Loan-to-Value pri refinancovaní (%)
  refinanceInterestRate: number;
  refinanceTerm: number;
  monthlyRent: number;
  monthlyExpenses: number;
}

export interface BRRRRResults {
  totalInvestment: number;
  forcedEquity: number; // Vytvorené equity rekonštrukciou
  refinanceAmount: number;
  cashLeftInDeal: number;
  cashRecovered: number;
  cashRecoveredPercent: number;
  monthlyMortgagePayment: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  cashOnCash: number;
  isInfiniteReturn: boolean; // Ak vybrali viac ako vložili
  equityPosition: number;
  roi: number;
}

export interface SlovakTaxInputs {
  capitalGain: number;
  yearsOwned: number;
  isBusinessAsset: boolean;
  isInheritance: boolean;
  isDirectLineInheritance: boolean;
  originalOwnerYearsOwned: number;
}

export interface SlovakTaxResults {
  isExempt: boolean;
  exemptionReason: string;
  taxableAmount: number;
  incomeTax: number;
  healthInsurance: number;
  totalTax: number;
  netGain: number;
  effectiveTaxRate: number;
}

// ============================================
// ZÁKLADNÉ VÝPOČTY
// ============================================

/**
 * Výpočet hrubého a čistého výnosu
 * 
 * Hrubý výnos = (Ročný nájom / Cena nehnuteľnosti) × 100
 * Čistý výnos = ((Ročný nájom - Náklady) / Cena nehnuteľnosti) × 100
 */
export function calculateYield(inputs: YieldInputs): YieldResults {
  const { purchasePrice, monthlyRent, monthlyExpenses, vacancyRatePercent } = inputs;
  
  const annualGrossIncome = monthlyRent * 12;
  const effectiveMonthlyRent = monthlyRent * (1 - vacancyRatePercent / 100);
  const annualNetIncome = (effectiveMonthlyRent - monthlyExpenses) * 12;
  
  const grossYield = (annualGrossIncome / purchasePrice) * 100;
  const netYield = (annualNetIncome / purchasePrice) * 100;
  
  return {
    grossYield: Math.round(grossYield * 100) / 100,
    netYield: Math.round(netYield * 100) / 100,
    annualGrossIncome,
    annualNetIncome: Math.round(annualNetIncome),
    effectiveMonthlyRent: Math.round(effectiveMonthlyRent),
  };
}

/**
 * Výpočet hypotekárnej splátky (anuitná metóda)
 * 
 * M = P × [r(1+r)^n] / [(1+r)^n – 1]
 * kde:
 * M = mesačná splátka
 * P = istina
 * r = mesačná úroková sadzba
 * n = počet splátok
 */
export function calculateMortgage(inputs: MortgageInputs): MortgageResults {
  const { loanAmount, annualInterestRate, loanTermYears } = inputs;
  
  if (loanAmount <= 0) {
    return {
      monthlyPayment: 0,
      totalInterest: 0,
      totalPayment: 0,
      amortizationSchedule: [],
    };
  }
  
  const monthlyRate = annualInterestRate / 100 / 12;
  const numberOfPayments = loanTermYears * 12;
  
  // Anuitná splátka
  const monthlyPayment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  
  const totalPayment = monthlyPayment * numberOfPayments;
  const totalInterest = totalPayment - loanAmount;
  
  // Amortizačná tabuľka (ročne)
  const amortizationSchedule: AmortizationRow[] = [];
  let remainingBalance = loanAmount;
  
  for (let year = 1; year <= loanTermYears; year++) {
    let yearlyPrincipal = 0;
    let yearlyInterest = 0;
    
    for (let month = 0; month < 12; month++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      
      yearlyInterest += interestPayment;
      yearlyPrincipal += principalPayment;
      remainingBalance -= principalPayment;
    }
    
    amortizationSchedule.push({
      year,
      principalPaid: Math.round(yearlyPrincipal),
      interestPaid: Math.round(yearlyInterest),
      remainingBalance: Math.max(0, Math.round(remainingBalance)),
    });
  }
  
  return {
    monthlyPayment: Math.round(monthlyPayment),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment),
    amortizationSchedule,
  };
}

/**
 * Výpočet mesačného cash flow
 * 
 * Cash Flow = Efektívny nájom - Náklady - Splátka hypotéky
 */
export function calculateCashFlow(inputs: CashFlowInputs): CashFlowResults {
  const yieldResults = calculateYield(inputs);
  const monthlyCashFlow = yieldResults.effectiveMonthlyRent - inputs.monthlyExpenses - inputs.mortgagePayment;
  
  // Break-even nájom = (Náklady + Splátka) / (1 - vacancy%)
  const breakEvenRent = (inputs.monthlyExpenses + inputs.mortgagePayment) / 
    (1 - inputs.vacancyRatePercent / 100);
  
  return {
    monthlyCashFlow: Math.round(monthlyCashFlow),
    annualCashFlow: Math.round(monthlyCashFlow * 12),
    isPositive: monthlyCashFlow > 0,
    breakEvenRent: Math.round(breakEvenRent),
  };
}

/**
 * Cash-on-Cash Return
 * 
 * CoC = (Ročný Cash Flow / Investovaná hotovosť) × 100
 * 
 * Toto je kľúčová metrika pre investorov používajúcich páku (leverage).
 * Ukazuje skutočný výnos na vložené peniaze.
 */
export function calculateCashOnCash(inputs: CashOnCashInputs): number {
  if (inputs.totalCashInvested <= 0) return 0;
  return (inputs.annualCashFlow / inputs.totalCashInvested) * 100;
}

// ============================================
// BRRRR STRATÉGIA
// ============================================

/**
 * BRRRR = Buy, Rehab, Rent, Refinance, Repeat
 * 
 * Populárna stratégia na recykláciu kapitálu:
 * 1. Kúpiš podhodnoten nehnuteľnosť
 * 2. Zrekonštruuješ ju (zvýšiš hodnotu)
 * 3. Prenajmeš (generuješ cash flow)
 * 4. Refinancuješ na novú (vyššiu) hodnotu
 * 5. Vyberieš vložený kapitál a opakuješ
 * 
 * Ideálny výsledok: Vyberieš všetku vloženú hotovosť a ostane ti
 * nehnuteľnosť s pozitívnym cash flow.
 */
export function calculateBRRRR(inputs: BRRRRInputs): BRRRRResults {
  const {
    purchasePrice,
    purchaseCosts,
    renovationCost,
    afterRepairValue,
    refinanceLTV,
    refinanceInterestRate,
    refinanceTerm,
    monthlyRent,
    monthlyExpenses,
  } = inputs;
  
  // Celková investícia (hotovosť)
  const totalInvestment = purchasePrice + purchaseCosts + renovationCost;
  
  // Forced Equity = hodnota po rekonštrukcii - celkové náklady
  const forcedEquity = afterRepairValue - totalInvestment;
  
  // Refinančný úver (typicky 75-80% ARV)
  const refinanceAmount = afterRepairValue * (refinanceLTV / 100);
  
  // Koľko hotovosti vyberieme späť
  const cashRecovered = refinanceAmount - purchasePrice - purchaseCosts;
  
  // Koľko hotovosti ostane v deale
  const cashLeftInDeal = totalInvestment - refinanceAmount;
  const cashLeftPositive = Math.max(0, cashLeftInDeal);
  
  // Percento vybranej hotovosti
  const cashRecoveredPercent = (cashRecovered / totalInvestment) * 100;
  
  // Nová splátka hypotéky
  const mortgageResults = calculateMortgage({
    loanAmount: refinanceAmount,
    annualInterestRate: refinanceInterestRate,
    loanTermYears: refinanceTerm,
  });
  
  // Cash flow
  const effectiveMonthlyRent = monthlyRent * 0.95; // 5% vacancy
  const monthlyCashFlow = effectiveMonthlyRent - monthlyExpenses - mortgageResults.monthlyPayment;
  const annualCashFlow = monthlyCashFlow * 12;
  
  // Cash-on-Cash (ak sme vybrali všetku hotovosť, je to teoreticky nekonečno)
  const isInfiniteReturn = cashLeftInDeal <= 0;
  const cashOnCash = isInfiniteReturn ? Infinity : (annualCashFlow / cashLeftPositive) * 100;
  
  // Equity pozícia = ARV - dlh
  const equityPosition = afterRepairValue - refinanceAmount;
  
  // ROI = (Equity + Cash flow) / Investícia
  const roi = ((forcedEquity + annualCashFlow) / totalInvestment) * 100;
  
  return {
    totalInvestment: Math.round(totalInvestment),
    forcedEquity: Math.round(forcedEquity),
    refinanceAmount: Math.round(refinanceAmount),
    cashLeftInDeal: Math.round(cashLeftInDeal),
    cashRecovered: Math.round(cashRecovered),
    cashRecoveredPercent: Math.round(cashRecoveredPercent * 10) / 10,
    monthlyMortgagePayment: mortgageResults.monthlyPayment,
    monthlyCashFlow: Math.round(monthlyCashFlow),
    annualCashFlow: Math.round(annualCashFlow),
    cashOnCash: isInfiniteReturn ? 999 : Math.round(cashOnCash * 10) / 10,
    isInfiniteReturn,
    equityPosition: Math.round(equityPosition),
    roi: Math.round(roi * 10) / 10,
  };
}

// ============================================
// SLOVENSKÁ DAŇ Z PREDAJA NEHNUTEĽNOSTÍ
// ============================================

/**
 * Daňové pravidlá pre SR (2026):
 * 
 * OSLOBODENIE (§ 9 ods. 1):
 * - 5 rokov od nadobudnutia nehnuteľnosti
 * - Pri dedení v priamom rade sa započítava doba poručiteľa
 * - Pri obchodnom majetku: 5 rokov od vyradenia
 * 
 * DAŇ Z PRÍJMU (§ 8):
 * - 19% do €50 234
 * - 25% nad €50 234
 * - Základ = Predajná cena - Nadobúdacia cena - Preukázateľné výdavky
 * 
 * ZDRAVOTNÉ POISTENIE:
 * - 15% zo základu dane (pre kapitálové príjmy)
 * - Neplatí sa pri oslobodení od dane
 */
export function calculateSlovakPropertyTax(inputs: SlovakTaxInputs): SlovakTaxResults {
  const {
    capitalGain,
    yearsOwned,
    isBusinessAsset,
    isInheritance,
    isDirectLineInheritance,
    originalOwnerYearsOwned,
  } = inputs;
  
  // Určenie celkovej doby vlastníctva pre oslobodenie
  let totalYearsForExemption = yearsOwned;
  
  if (isInheritance && isDirectLineInheritance) {
    totalYearsForExemption += originalOwnerYearsOwned;
  }
  
  // Kontrola oslobodenia
  const exemptionYears = isBusinessAsset ? 5 : 5; // Obe podmienky vyžadujú 5 rokov
  const isExempt = totalYearsForExemption >= exemptionYears;
  
  let exemptionReason = "";
  if (isExempt) {
    if (isInheritance && isDirectLineInheritance) {
      exemptionReason = "Dedenie v priamom rade + celková doba vlastníctva > 5 rokov";
    } else if (isBusinessAsset) {
      exemptionReason = "Uplynulo 5 rokov od vyradenia z obchodného majetku";
    } else {
      exemptionReason = "Uplynulo 5 rokov od nadobudnutia";
    }
  }
  
  // Ak je oslobodené, žiadna daň
  if (isExempt || capitalGain <= 0) {
    return {
      isExempt: isExempt || capitalGain <= 0,
      exemptionReason: capitalGain <= 0 ? "Žiadny kapitálový zisk" : exemptionReason,
      taxableAmount: 0,
      incomeTax: 0,
      healthInsurance: 0,
      totalTax: 0,
      netGain: Math.max(0, capitalGain),
      effectiveTaxRate: 0,
    };
  }
  
  // Výpočet dane
  const taxableAmount = capitalGain;
  const threshold = 50234; // 176,8 × 284,13 pre 2026
  
  let incomeTax = 0;
  if (taxableAmount <= threshold) {
    incomeTax = taxableAmount * 0.19;
  } else {
    incomeTax = (threshold * 0.19) + ((taxableAmount - threshold) * 0.25);
  }
  
  // Zdravotné poistenie (15% pre kapitálové príjmy)
  const healthInsurance = taxableAmount * 0.15;
  
  const totalTax = incomeTax + healthInsurance;
  const netGain = capitalGain - totalTax;
  const effectiveTaxRate = (totalTax / capitalGain) * 100;
  
  return {
    isExempt: false,
    exemptionReason: "",
    taxableAmount: Math.round(taxableAmount),
    incomeTax: Math.round(incomeTax),
    healthInsurance: Math.round(healthInsurance),
    totalTax: Math.round(totalTax),
    netGain: Math.round(netGain),
    effectiveTaxRate: Math.round(effectiveTaxRate * 10) / 10,
  };
}

// ============================================
// POMOCNÉ FUNKCIE
// ============================================

/**
 * Formátovanie meny
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formátovanie percenta
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Hodnotenie investície podľa cash-on-cash
 */
export function rateInvestment(cashOnCash: number): {
  rating: "excellent" | "good" | "average" | "poor";
  label: string;
  color: string;
} {
  if (cashOnCash >= 12) {
    return { rating: "excellent", label: "Výborná", color: "emerald" };
  } else if (cashOnCash >= 8) {
    return { rating: "good", label: "Dobrá", color: "green" };
  } else if (cashOnCash >= 5) {
    return { rating: "average", label: "Priemerná", color: "yellow" };
  } else {
    return { rating: "poor", label: "Slabá", color: "red" };
  }
}

/**
 * Slovenské benchmarky pre investorov
 */
export const SLOVAK_BENCHMARKS = {
  // Hrubý výnos
  grossYield: {
    excellent: 7,
    good: 5,
    average: 4,
    poor: 3,
  },
  // Cash-on-Cash
  cashOnCash: {
    excellent: 12,
    good: 8,
    average: 5,
    poor: 2,
  },
  // Priemerné ceny za m² podľa regiónov (Q3 2025)
  pricePerSqm: {
    BA: 3800,
    KE: 2100,
    PO: 1850,
    ZA: 2200,
    BB: 1750,
    TT: 2400,
    TN: 1900,
    NR: 1650,
  },
  // Priemerné nájomné za m² podľa regiónov
  rentPerSqm: {
    BA: 15,
    KE: 10,
    PO: 8,
    ZA: 11,
    BB: 9,
    TT: 12,
    TN: 9,
    NR: 8,
  },
} as const;
