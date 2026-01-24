// Intelligent Parser - Extrakcia štruktúrovaných dát z popisu inzerátu

import type { PropertyCondition, EnergyCertificate } from "@/generated/prisma";

/**
 * Regex patterny pre extrakciu informácií z popisu
 */
const PATTERNS = {
  // Stav nehnuteľnosti
  condition: {
    NOVOSTAVBA: /\b(novostavba|nová stavba|nový byt|novostavbe|kolaudáci[au]|developer)\b/i,
    REKONSTRUKCIA: /\b(rekonštrukci[au]|zrekonštruo|po rekonštrukcii|kompletná rekonštrukcia|čiastočná rekonštrukcia|zrenovovan|renovovan|modernizovan)\b/i,
    POVODNY: /\b(pôvodn[ýé]|v pôvodnom stave|čiastočná úprava|potrebuje rekonštrukciu|na rekonštrukciu|vhodný na rekonštrukciu)\b/i,
  },
  
  // Energetický certifikát
  energyCertificate: {
    A: /\b(energetick[ýá]\s*(certifikát|trieda|kategória)?[\s:]*A\b|trieda\s*A\b|kategória\s*A\b|nízkoenergetick)/i,
    B: /\b(energetick[ýá]\s*(certifikát|trieda|kategória)?[\s:]*B\b|trieda\s*B\b)/i,
    C: /\b(energetick[ýá]\s*(certifikát|trieda|kategória)?[\s:]*C\b|trieda\s*C\b)/i,
    D: /\b(energetick[ýá]\s*(certifikát|trieda|kategória)?[\s:]*D\b|trieda\s*D\b)/i,
    E: /\b(energetick[ýá]\s*(certifikát|trieda|kategória)?[\s:]*E\b|trieda\s*E\b)/i,
    F: /\b(energetick[ýá]\s*(certifikát|trieda|kategória)?[\s:]*F\b|trieda\s*F\b)/i,
    G: /\b(energetick[ýá]\s*(certifikát|trieda|kategória)?[\s:]*G\b|trieda\s*G\b)/i,
  },
  
  // Poschodie
  floor: /\b(\d{1,2})\.?\s*(poschodie|poschodí|p\.|np|nadzemné|podlaží|floor)/i,
  floorAlt: /\bposchodie[\s:]*(\d{1,2})/i,
  floorTotal: /\b(\d{1,2})[\s-]*(poschodov[áý]|podlažn[ýá])\s*(budova|dom|bytov[ýá])/i,
  groundFloor: /\b(prízemie|prízemí|ground\s*floor)\b/i,
  
  // Výťah
  elevator: /\b(výťah|lift|elevator|s výťahom|bez výťahu)\b/i,
  noElevator: /\b(bez výťahu|nemá výťah)\b/i,
  
  // Balkón / Loggia / Terasa
  balcony: /\b(balkón|balkónom|lodži[au]|loggia|teras[au]|terasa)\b/i,
  
  // Parkovanie
  parking: /\b(parkovanie|parkovacie|parkov\.|garážov[éá]|garáž|státie|parking)\b/i,
  garage: /\b(garáž|garážou|garage)\b/i,
  
  // Pivnica
  cellar: /\b(pivnic[au]|pivničn[ýá]|sklep|cellar)\b/i,
  
  // Zateplenie
  insulation: {
    polystyrene: /\b(polystyrén|eps|zateplen[ýá])\b/i,
    mineralWool: /\b(minerálna vlna|minerálnou vlnou|kamenn[áa] vlna)\b/i,
    none: /\b(nezateplen[ýá]|bez zateplenia)\b/i,
  },
  
  // Kúrenie
  heating: {
    central: /\b(ústredné kúrenie|ústredným|centrálne vykurovanie|CZT|diaľkové)\b/i,
    gas: /\b(plynov[éý] kúrenie|plynov[ýá] kotol|plyn\.|kombi\s*kotol)\b/i,
    electric: /\b(elektrick[éý] kúrenie|elektrické vykurovanie|elektrokotol|tepelné čerpadlo|tepeln[éý] čerpadl)/i,
    solid: /\b(tuhé palivo|krb|krbom|pec|drevo|uhlie)\b/i,
    floor: /\b(podlahov[éý] kúrenie|podlahov[éý]m vykurovaním)\b/i,
  },
  
  // Rok výstavby
  yearBuilt: /\b(rok výstavby|postaven[ýá]|skolaudovan[ýá]|z roku|vystavba)[\s:]*(\d{4})\b/i,
  yearBuiltAlt: /\b(19[5-9]\d|20[0-2]\d)\s*(rok|rokov|výstavba|postavený|postaven[áé])\b/i,
  
  // Počet izieb
  rooms: /\b(\d)[+\-]?(izbov[ýá]|izb\.|garsónka|garsonka)\b/i,
  roomsAlt: /\b(\d)\s*(izby|izba|izbový)\b/i,
  studio: /\b(garsónka|garsonka|1\+kk|studio|štúdio)\b/i,
  
  // Plocha
  area: /\b(\d{2,3})[,.]?(\d{0,2})?\s*(m2|m²|štvorcov[ýé]ch\s*metr)/i,
  
  // Cena
  price: /\b(\d{1,3}[\s,.]?\d{3}[\s,.]?\d{3}|\d{1,3}[\s,.]?\d{3})\s*(€|eur|euro)/i,
};

/**
 * Extrahuje stav nehnuteľnosti z popisu
 */
export function parseCondition(text: string): PropertyCondition {
  const normalizedText = text.toLowerCase();
  
  if (PATTERNS.condition.NOVOSTAVBA.test(normalizedText)) {
    return "NOVOSTAVBA";
  }
  if (PATTERNS.condition.REKONSTRUKCIA.test(normalizedText)) {
    return "REKONSTRUKCIA";
  }
  if (PATTERNS.condition.POVODNY.test(normalizedText)) {
    return "POVODNY";
  }
  
  // Default - ak nie je špecifikované, predpokladáme pôvodný stav
  return "POVODNY";
}

/**
 * Extrahuje energetický certifikát
 */
export function parseEnergyCertificate(text: string): EnergyCertificate {
  const normalizedText = text.toUpperCase();
  
  for (const [cert, pattern] of Object.entries(PATTERNS.energyCertificate)) {
    if (pattern.test(text)) {
      return cert as EnergyCertificate;
    }
  }
  
  return "NONE";
}

/**
 * Extrahuje poschodie
 */
export function parseFloor(text: string): { floor: number | undefined; totalFloors: number | undefined } {
  // Prízemie
  if (PATTERNS.groundFloor.test(text)) {
    return { floor: 0, totalFloors: undefined };
  }
  
  // Štandardné poschodie
  let match = text.match(PATTERNS.floor);
  if (match) {
    const floor = parseInt(match[1], 10);
    
    // Skús nájsť celkový počet poschodí
    const totalMatch = text.match(PATTERNS.floorTotal);
    const totalFloors = totalMatch ? parseInt(totalMatch[1], 10) : undefined;
    
    return { floor, totalFloors };
  }
  
  // Alternatívny formát
  match = text.match(PATTERNS.floorAlt);
  if (match) {
    return { floor: parseInt(match[1], 10), totalFloors: undefined };
  }
  
  return { floor: undefined, totalFloors: undefined };
}

/**
 * Extrahuje či má výťah
 */
export function parseElevator(text: string): boolean {
  if (PATTERNS.noElevator.test(text)) {
    return false;
  }
  if (PATTERNS.elevator.test(text)) {
    return true;
  }
  return false;
}

/**
 * Extrahuje či má balkón/terasu/loggiu
 */
export function parseBalcony(text: string): boolean {
  return PATTERNS.balcony.test(text);
}

/**
 * Extrahuje parkovacie možnosti
 */
export function parseParking(text: string): { hasParking: boolean; hasGarage: boolean } {
  return {
    hasParking: PATTERNS.parking.test(text),
    hasGarage: PATTERNS.garage.test(text),
  };
}

/**
 * Extrahuje či má pivnicu
 */
export function parseCellar(text: string): boolean {
  return PATTERNS.cellar.test(text);
}

/**
 * Extrahuje typ zateplenia
 */
export function parseInsulation(text: string): string | undefined {
  if (PATTERNS.insulation.polystyrene.test(text)) {
    return "polystyrene";
  }
  if (PATTERNS.insulation.mineralWool.test(text)) {
    return "mineral_wool";
  }
  if (PATTERNS.insulation.none.test(text)) {
    return "none";
  }
  return undefined;
}

/**
 * Extrahuje typ kúrenia
 */
export function parseHeating(text: string): string | undefined {
  if (PATTERNS.heating.floor.test(text)) {
    return "floor";
  }
  if (PATTERNS.heating.central.test(text)) {
    return "central";
  }
  if (PATTERNS.heating.gas.test(text)) {
    return "gas";
  }
  if (PATTERNS.heating.electric.test(text)) {
    return "electric";
  }
  if (PATTERNS.heating.solid.test(text)) {
    return "solid";
  }
  return undefined;
}

/**
 * Extrahuje rok výstavby
 */
export function parseYearBuilt(text: string): number | undefined {
  let match = text.match(PATTERNS.yearBuilt);
  if (match) {
    const year = parseInt(match[2], 10);
    if (year >= 1900 && year <= new Date().getFullYear()) {
      return year;
    }
  }
  
  match = text.match(PATTERNS.yearBuiltAlt);
  if (match) {
    const year = parseInt(match[1], 10);
    if (year >= 1900 && year <= new Date().getFullYear()) {
      return year;
    }
  }
  
  return undefined;
}

/**
 * Extrahuje počet izieb
 */
export function parseRooms(text: string): number | undefined {
  if (PATTERNS.studio.test(text)) {
    return 1;
  }
  
  let match = text.match(PATTERNS.rooms);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  match = text.match(PATTERNS.roomsAlt);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return undefined;
}

/**
 * Extrahuje plochu v m²
 */
export function parseArea(text: string): number | undefined {
  const match = text.match(PATTERNS.area);
  if (match) {
    const wholePart = parseInt(match[1], 10);
    const decimalPart = match[2] ? parseInt(match[2], 10) / Math.pow(10, match[2].length) : 0;
    return wholePart + decimalPart;
  }
  return undefined;
}

/**
 * Extrahuje cenu v EUR
 */
export function parsePrice(text: string): number | undefined {
  const match = text.match(PATTERNS.price);
  if (match) {
    // Odstráni medzery a čiarky, konvertuje na číslo
    const priceStr = match[1].replace(/[\s,.]/g, "");
    return parseInt(priceStr, 10);
  }
  return undefined;
}

/**
 * Kompletná extrakcia všetkých údajov z popisu
 */
export function parseDescription(description: string, title: string = ""): {
  condition: PropertyCondition;
  energyCertificate: EnergyCertificate;
  floor?: number;
  totalFloors?: number;
  hasElevator: boolean;
  hasBalcony: boolean;
  hasParking: boolean;
  hasGarage: boolean;
  hasCellar: boolean;
  insulationType?: string;
  heatingType?: string;
  yearBuilt?: number;
  rooms?: number;
} {
  const fullText = `${title} ${description}`;
  const { floor, totalFloors } = parseFloor(fullText);
  const { hasParking, hasGarage } = parseParking(fullText);
  
  return {
    condition: parseCondition(fullText),
    energyCertificate: parseEnergyCertificate(fullText),
    floor,
    totalFloors,
    hasElevator: parseElevator(fullText),
    hasBalcony: parseBalcony(fullText),
    hasParking,
    hasGarage,
    hasCellar: parseCellar(fullText),
    insulationType: parseInsulation(fullText),
    heatingType: parseHeating(fullText),
    yearBuilt: parseYearBuilt(fullText),
    rooms: parseRooms(fullText),
  };
}
