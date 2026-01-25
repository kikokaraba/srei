/**
 * Urban Impact Prediction
 * 
 * Predikcia vplyvu infraštruktúry na ceny nehnuteľností
 * "Volvo Effect" - byť tam skôr než verejnosť
 */

import { prisma } from "@/lib/prisma";
import type { InfrastructureType } from "@/generated/prisma/client";

// ============================================
// TYPES
// ============================================

export interface UrbanProject {
  id: string;
  name: string;
  type: InfrastructureType;
  city: string;
  district?: string;
  status: "planned" | "in_progress" | "completed";
  completionDate?: Date;
  estimatedImpact: number; // % vplyv na ceny
  radius: number; // km - oblasť vplyvu
  description: string;
}

export interface UrbanImpactPrediction {
  city: string;
  district?: string;
  totalImpact: number; // Celkový očakávaný vplyv na ceny (%)
  timeframe: string; // "6 mesiacov", "1 rok", etc.
  confidence: number; // 0-100
  projects: UrbanProjectImpact[];
  investorSignal: "strong_buy" | "buy" | "hold" | "caution";
  recommendation: string;
}

export interface UrbanProjectImpact {
  project: UrbanProject;
  distanceKm: number;
  impactScore: number; // 0-100
  priceChangeEstimate: number; // %
  completionMonths: number;
}

// ============================================
// HISTORICAL IMPACT DATA
// Založené na historických dátach zo Slovenska
// ============================================

const IMPACT_MULTIPLIERS: Record<InfrastructureType, { 
  baseImpact: number; 
  maxRadius: number;
  timeToImpact: number; // mesiace
}> = {
  METRO_STATION: { baseImpact: 15, maxRadius: 2, timeToImpact: 6 },
  TRAM_STATION: { baseImpact: 8, maxRadius: 1, timeToImpact: 3 },
  HIGHWAY: { baseImpact: 12, maxRadius: 5, timeToImpact: 12 },
  SHOPPING_CENTER: { baseImpact: 10, maxRadius: 3, timeToImpact: 6 },
  SCHOOL: { baseImpact: 5, maxRadius: 1.5, timeToImpact: 6 },
  HOSPITAL: { baseImpact: 7, maxRadius: 3, timeToImpact: 12 },
  PARK: { baseImpact: 6, maxRadius: 1, timeToImpact: 3 },
  BUSINESS_DISTRICT: { baseImpact: 18, maxRadius: 4, timeToImpact: 18 },
};

// Plánované projekty na Slovensku (mock data - v produkcii by bolo z DB)
const KNOWN_PROJECTS: UrbanProject[] = [
  {
    id: "metro-ba-1",
    name: "D4/R7 obchvat Bratislavy",
    type: "HIGHWAY",
    city: "BRATISLAVA",
    status: "in_progress",
    completionDate: new Date("2026-06-01"),
    estimatedImpact: 12,
    radius: 5,
    description: "Diaľničný obchvat - lepšia dostupnosť okrajových častí",
  },
  {
    id: "nivy-ba",
    name: "Nivy Mall & Business District",
    type: "BUSINESS_DISTRICT",
    city: "BRATISLAVA",
    district: "Ružinov",
    status: "completed",
    completionDate: new Date("2023-01-01"),
    estimatedImpact: 18,
    radius: 2,
    description: "Nové obchodné a biznis centrum",
  },
  {
    id: "southcity-ba",
    name: "Southcity Petržalka",
    type: "BUSINESS_DISTRICT",
    city: "BRATISLAVA",
    district: "Petržalka",
    status: "in_progress",
    completionDate: new Date("2027-01-01"),
    estimatedImpact: 15,
    radius: 2,
    description: "Rozvoj južnej časti Petržalky",
  },
  {
    id: "r2-ke",
    name: "R2 Rýchlostná cesta Košice",
    type: "HIGHWAY",
    city: "KOSICE",
    status: "planned",
    completionDate: new Date("2028-01-01"),
    estimatedImpact: 10,
    radius: 8,
    description: "Napojenie na diaľničnú sieť",
  },
  {
    id: "aupark-za",
    name: "Aupark Žilina - rozšírenie",
    type: "SHOPPING_CENTER",
    city: "ZILINA",
    status: "planned",
    completionDate: new Date("2026-12-01"),
    estimatedImpact: 8,
    radius: 3,
    description: "Rozšírenie nákupného centra",
  },
  {
    id: "hospital-bb",
    name: "Nová nemocnica Banská Bystrica",
    type: "HOSPITAL",
    city: "BANSKA_BYSTRICA",
    status: "planned",
    completionDate: new Date("2028-06-01"),
    estimatedImpact: 7,
    radius: 4,
    description: "Moderné regionálne zdravotnícke centrum",
  },
];

// ============================================
// IMPACT CALCULATION
// ============================================

/**
 * Vypočíta vplyv projektu na základe vzdialenosti a typu
 */
function calculateProjectImpact(
  project: UrbanProject,
  distanceKm: number
): number {
  const config = IMPACT_MULTIPLIERS[project.type];
  
  if (distanceKm > config.maxRadius) {
    return 0; // Mimo dosahu vplyvu
  }

  // Lineárne klesajúci vplyv so vzdialenosťou
  const distanceFactor = 1 - (distanceKm / config.maxRadius);
  
  // Vplyv statusu projektu
  const statusFactor = 
    project.status === "completed" ? 1.0 :
    project.status === "in_progress" ? 0.7 :
    0.4;

  const impact = config.baseImpact * distanceFactor * statusFactor;
  
  return Math.round(impact * 10) / 10;
}

/**
 * Vypočíta mesiace do dokončenia
 */
function monthsUntilCompletion(project: UrbanProject): number {
  if (!project.completionDate) return 24; // Default
  
  const now = new Date();
  const completion = new Date(project.completionDate);
  const months = (completion.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  return Math.max(0, Math.round(months));
}

// ============================================
// MAIN PREDICTION FUNCTION
// ============================================

/**
 * Získa Urban Impact prediction pre lokáciu
 */
export async function getUrbanImpactPrediction(
  city: string,
  district?: string
): Promise<UrbanImpactPrediction> {
  // Nájdi relevantné projekty pre mesto
  const relevantProjects = KNOWN_PROJECTS.filter(p => {
    if (p.city !== city) return false;
    if (district && p.district && p.district !== district) return false;
    return true;
  });

  // Vypočítaj vplyv každého projektu
  const projectImpacts: UrbanProjectImpact[] = relevantProjects.map(project => {
    // Simulovaná vzdialenosť (v produkcii by bola vypočítaná z koordinátov)
    const distanceKm = project.district === district ? 0.5 : 2;
    const impactScore = calculateProjectImpact(project, distanceKm);
    const completionMonths = monthsUntilCompletion(project);

    return {
      project,
      distanceKm,
      impactScore,
      priceChangeEstimate: impactScore,
      completionMonths,
    };
  });

  // Celkový vplyv (nie len súčet, ale komplikovanejší výpočet)
  const totalImpact = projectImpacts.reduce((sum, p) => {
    // Diminishing returns - každý ďalší projekt má menší marginálny vplyv
    const multiplier = 1 / (1 + sum / 20);
    return sum + p.impactScore * multiplier;
  }, 0);

  // Časový rámec
  const avgCompletionMonths = projectImpacts.length > 0
    ? projectImpacts.reduce((sum, p) => sum + p.completionMonths, 0) / projectImpacts.length
    : 0;

  let timeframe: string;
  if (avgCompletionMonths <= 6) timeframe = "6 mesiacov";
  else if (avgCompletionMonths <= 12) timeframe = "1 rok";
  else if (avgCompletionMonths <= 24) timeframe = "2 roky";
  else timeframe = "3+ roky";

  // Confidence based on project count and status
  const completedProjects = projectImpacts.filter(p => p.project.status === "completed").length;
  const inProgressProjects = projectImpacts.filter(p => p.project.status === "in_progress").length;
  const confidence = Math.min(100, 
    30 + completedProjects * 20 + inProgressProjects * 15 + projectImpacts.length * 5
  );

  // Investor signal
  let investorSignal: "strong_buy" | "buy" | "hold" | "caution";
  if (totalImpact > 15 && avgCompletionMonths < 18) {
    investorSignal = "strong_buy";
  } else if (totalImpact > 8) {
    investorSignal = "buy";
  } else if (totalImpact > 3) {
    investorSignal = "hold";
  } else {
    investorSignal = "caution";
  }

  // Recommendation
  let recommendation: string;
  if (investorSignal === "strong_buy") {
    recommendation = `Silný potenciál rastu! ${projectImpacts.length} projekty zvýšia hodnotu o ~${Math.round(totalImpact)}% v priebehu ${timeframe}. Nakupuj pred verejnosťou.`;
  } else if (investorSignal === "buy") {
    recommendation = `Pozitívny výhľad. Očakávaný rast ${Math.round(totalImpact)}%. Sleduj vývoj projektov.`;
  } else if (investorSignal === "hold") {
    recommendation = `Stabilná lokalita s miernym rastovým potenciálom. Vhodné pre dlhodobé investície.`;
  } else {
    recommendation = `Žiadne významné projekty v okolí. Rast závislý len na celkovom trhu.`;
  }

  return {
    city,
    district,
    totalImpact: Math.round(totalImpact * 10) / 10,
    timeframe,
    confidence,
    projects: projectImpacts.sort((a, b) => b.impactScore - a.impactScore),
    investorSignal,
    recommendation,
  };
}

/**
 * Získa prehľad Urban Impact pre všetky mestá
 */
export async function getUrbanImpactOverview(): Promise<{
  hotspots: Array<{
    city: string;
    district?: string;
    impact: number;
    signal: string;
    topProject: string;
  }>;
  upcomingProjects: UrbanProject[];
}> {
  const cities: string[] = [
    "BRATISLAVA", "KOSICE", "PRESOV", "ZILINA",
    "BANSKA_BYSTRICA", "TRNAVA", "TRENCIN", "NITRA"
  ];

  const predictions = await Promise.all(
    cities.map(city => getUrbanImpactPrediction(city))
  );

  const hotspots = predictions
    .filter(p => p.totalImpact > 5)
    .map(p => ({
      city: p.city,
      district: p.district,
      impact: p.totalImpact,
      signal: p.investorSignal,
      topProject: p.projects[0]?.project.name || "N/A",
    }))
    .sort((a, b) => b.impact - a.impact);

  const upcomingProjects = KNOWN_PROJECTS
    .filter(p => p.status !== "completed")
    .sort((a, b) => {
      const dateA = a.completionDate?.getTime() || Infinity;
      const dateB = b.completionDate?.getTime() || Infinity;
      return dateA - dateB;
    });

  return {
    hotspots,
    upcomingProjects,
  };
}

/**
 * Pridá projekt do sledovania (pre admin)
 */
export async function addUrbanProject(project: Omit<UrbanProject, "id">): Promise<UrbanProject> {
  const newProject: UrbanProject = {
    ...project,
    id: `project_${Date.now()}`,
  };
  
  // V produkcii by sa uložil do databázy
  KNOWN_PROJECTS.push(newProject);
  
  return newProject;
}
