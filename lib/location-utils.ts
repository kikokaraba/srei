/**
 * Location Selection Utilities
 * 
 * Optimalizovaná logika pre hierarchický výber lokalít:
 * - Ak je vybraný celý kraj → uložíme len regionId
 * - Ak je vybraný celý okres → uložíme len districtId
 * - Ak sú vybrané jednotlivé mestá → uložíme cityId
 * 
 * Toto šetrí databázové miesto a zjednodušuje query.
 */

import {
  REGIONS,
  DISTRICTS,
  getDistrictsByRegion,
  type Region,
  type District,
} from "@/lib/constants/slovakia-locations";

// ============================================
// TYPES
// ============================================

export interface LocationSelection {
  regions: string[];    // ID krajov (napr. ["BA", "KE"])
  districts: string[];  // ID okresov (napr. ["MA", "SC"])
  cities: string[];     // Názvy miest (napr. ["Malacky", "Pezinok"])
}

export interface NormalizedSelection {
  regions: string[];
  districts: string[];
  cities: string[];
}

export interface SelectionState {
  isSelected: boolean;
  isIndeterminate: boolean;
}

// ============================================
// NORMALIZATION - Optimalizácia pred uložením
// ============================================

/**
 * Normalizuje výber lokalít pre uloženie do databázy.
 * 
 * Logika:
 * 1. Ak sú všetky okresy v kraji vybrané → ulož len kraj
 * 2. Ak sú všetky mestá v okrese vybrané → ulož len okres
 * 3. Inak ulož konkrétne mestá
 */
export function normalizeSelection(
  selectedRegions: string[],
  selectedDistricts: string[],
  selectedCities: string[]
): NormalizedSelection {
  const normalizedRegions = new Set<string>(selectedRegions);
  const normalizedDistricts = new Set<string>();
  const normalizedCities = new Set<string>();

  // Pre každý okres, skontroluj či by mal byť povýšený na región
  for (const districtId of selectedDistricts) {
    const district = DISTRICTS[districtId];
    if (!district) continue;

    // Ak je región už vybraný, okres netreba
    if (normalizedRegions.has(district.regionId)) {
      continue;
    }

    normalizedDistricts.add(districtId);
  }

  // Pre každé mesto, skontroluj či patrí pod vybraný okres/región
  for (const cityName of selectedCities) {
    // Nájdi okres, do ktorého mesto patrí
    let cityDistrictId: string | null = null;
    for (const [districtId, district] of Object.entries(DISTRICTS)) {
      if (district.cities.includes(cityName)) {
        cityDistrictId = districtId;
        break;
      }
    }

    if (!cityDistrictId) {
      // Mesto nepatrí do žiadneho okresu - ulož ho
      normalizedCities.add(cityName);
      continue;
    }

    const district = DISTRICTS[cityDistrictId];
    
    // Ak je región vybraný, mesto netreba
    if (normalizedRegions.has(district.regionId)) {
      continue;
    }

    // Ak je okres vybraný, mesto netreba
    if (normalizedDistricts.has(cityDistrictId)) {
      continue;
    }

    normalizedCities.add(cityName);
  }

  // Teraz skontroluj, či môžeme povýšiť okresy na regióny
  for (const regionId of Object.keys(REGIONS)) {
    if (normalizedRegions.has(regionId)) continue;

    const districtsInRegion = getDistrictsByRegion(regionId);
    const allDistrictsSelected = districtsInRegion.every(d => 
      normalizedDistricts.has(d.id)
    );

    if (allDistrictsSelected && districtsInRegion.length > 0) {
      // Povýš na región
      normalizedRegions.add(regionId);
      // Odstráň okresy
      for (const d of districtsInRegion) {
        normalizedDistricts.delete(d.id);
      }
    }
  }

  // Skontroluj, či môžeme povýšiť mestá na okresy
  for (const [districtId, district] of Object.entries(DISTRICTS)) {
    if (normalizedDistricts.has(districtId)) continue;
    if (normalizedRegions.has(district.regionId)) continue;

    const citiesInDistrict = district.cities;
    const allCitiesSelected = citiesInDistrict.every(c => 
      normalizedCities.has(c)
    );

    if (allCitiesSelected && citiesInDistrict.length > 0) {
      // Povýš na okres
      normalizedDistricts.add(districtId);
      // Odstráň mestá
      for (const c of citiesInDistrict) {
        normalizedCities.delete(c);
      }
    }
  }

  // Po povýšení okresov, znovu skontroluj regióny
  for (const regionId of Object.keys(REGIONS)) {
    if (normalizedRegions.has(regionId)) continue;

    const districtsInRegion = getDistrictsByRegion(regionId);
    const allDistrictsSelected = districtsInRegion.every(d => 
      normalizedDistricts.has(d.id)
    );

    if (allDistrictsSelected && districtsInRegion.length > 0) {
      normalizedRegions.add(regionId);
      for (const d of districtsInRegion) {
        normalizedDistricts.delete(d.id);
      }
    }
  }

  return {
    regions: Array.from(normalizedRegions),
    districts: Array.from(normalizedDistricts),
    cities: Array.from(normalizedCities),
  };
}

// ============================================
// EXPANSION - Rozbalenie pre UI a query
// ============================================

/**
 * Rozbalí výber na všetky mestá pre query.
 * Používa sa pri filtrovaní nehnuteľností.
 */
export function expandToAllCities(selection: NormalizedSelection): string[] {
  const allCities = new Set<string>();

  // Pridaj mestá z regiónov
  for (const regionId of selection.regions) {
    const districts = getDistrictsByRegion(regionId);
    for (const district of districts) {
      for (const city of district.cities) {
        allCities.add(city);
      }
    }
  }

  // Pridaj mestá z okresov
  for (const districtId of selection.districts) {
    const district = DISTRICTS[districtId];
    if (district) {
      for (const city of district.cities) {
        allCities.add(city);
      }
    }
  }

  // Pridaj jednotlivé mestá
  for (const city of selection.cities) {
    allCities.add(city);
  }

  return Array.from(allCities);
}

/**
 * Rozbalí výber na všetky okresy pre query.
 */
export function expandToAllDistricts(selection: NormalizedSelection): string[] {
  const allDistricts = new Set<string>();

  // Pridaj okresy z regiónov
  for (const regionId of selection.regions) {
    const districts = getDistrictsByRegion(regionId);
    for (const district of districts) {
      allDistricts.add(district.id);
    }
  }

  // Pridaj jednotlivé okresy
  for (const districtId of selection.districts) {
    allDistricts.add(districtId);
  }

  return Array.from(allDistricts);
}

// ============================================
// UI STATE HELPERS
// ============================================

/**
 * Zistí stav výberu pre región (selected/indeterminate).
 */
export function getRegionState(
  regionId: string,
  selectedRegions: string[],
  selectedDistricts: string[],
  selectedCities: string[]
): SelectionState {
  if (selectedRegions.includes(regionId)) {
    return { isSelected: true, isIndeterminate: false };
  }

  const districtsInRegion = getDistrictsByRegion(regionId);
  
  // Skontroluj či je aspoň niečo vybrané
  let hasAnySelected = false;
  let allSelected = true;

  for (const district of districtsInRegion) {
    const districtState = getDistrictState(
      district.id,
      selectedRegions,
      selectedDistricts,
      selectedCities
    );

    if (districtState.isSelected) {
      hasAnySelected = true;
    } else if (districtState.isIndeterminate) {
      hasAnySelected = true;
      allSelected = false;
    } else {
      allSelected = false;
    }
  }

  if (allSelected && districtsInRegion.length > 0) {
    return { isSelected: true, isIndeterminate: false };
  }

  if (hasAnySelected) {
    return { isSelected: false, isIndeterminate: true };
  }

  return { isSelected: false, isIndeterminate: false };
}

/**
 * Zistí stav výberu pre okres.
 */
export function getDistrictState(
  districtId: string,
  selectedRegions: string[],
  selectedDistricts: string[],
  selectedCities: string[]
): SelectionState {
  const district = DISTRICTS[districtId];
  if (!district) {
    return { isSelected: false, isIndeterminate: false };
  }

  // Ak je región vybraný, okres je tiež vybraný
  if (selectedRegions.includes(district.regionId)) {
    return { isSelected: true, isIndeterminate: false };
  }

  if (selectedDistricts.includes(districtId)) {
    return { isSelected: true, isIndeterminate: false };
  }

  // Skontroluj mestá
  const citiesInDistrict = district.cities;
  const selectedCitiesInDistrict = citiesInDistrict.filter(c => 
    selectedCities.includes(c)
  );

  if (selectedCitiesInDistrict.length === citiesInDistrict.length && citiesInDistrict.length > 0) {
    return { isSelected: true, isIndeterminate: false };
  }

  if (selectedCitiesInDistrict.length > 0) {
    return { isSelected: false, isIndeterminate: true };
  }

  return { isSelected: false, isIndeterminate: false };
}

/**
 * Zistí, či je mesto vybrané.
 */
export function isCitySelected(
  cityName: string,
  districtId: string,
  selectedRegions: string[],
  selectedDistricts: string[],
  selectedCities: string[]
): boolean {
  const district = DISTRICTS[districtId];
  if (!district) return false;

  // Ak je región vybraný
  if (selectedRegions.includes(district.regionId)) {
    return true;
  }

  // Ak je okres vybraný
  if (selectedDistricts.includes(districtId)) {
    return true;
  }

  // Ak je mesto priamo vybrané
  return selectedCities.includes(cityName);
}

// ============================================
// SELECTION ACTIONS
// ============================================

/**
 * Toggle región - vracia nový stav.
 */
export function toggleRegion(
  regionId: string,
  selectedRegions: string[],
  selectedDistricts: string[],
  selectedCities: string[]
): NormalizedSelection {
  const state = getRegionState(regionId, selectedRegions, selectedDistricts, selectedCities);
  const districtsInRegion = getDistrictsByRegion(regionId);

  if (state.isSelected || state.isIndeterminate) {
    // Odznač región a všetko pod ním
    return normalizeSelection(
      selectedRegions.filter(r => r !== regionId),
      selectedDistricts.filter(d => !districtsInRegion.some(dr => dr.id === d)),
      selectedCities.filter(c => !districtsInRegion.some(dr => dr.cities.includes(c)))
    );
  } else {
    // Označ celý región
    return normalizeSelection(
      [...selectedRegions, regionId],
      selectedDistricts.filter(d => !districtsInRegion.some(dr => dr.id === d)),
      selectedCities.filter(c => !districtsInRegion.some(dr => dr.cities.includes(c)))
    );
  }
}

/**
 * Toggle okres - vracia nový stav.
 */
export function toggleDistrict(
  districtId: string,
  selectedRegions: string[],
  selectedDistricts: string[],
  selectedCities: string[]
): NormalizedSelection {
  const district = DISTRICTS[districtId];
  if (!district) {
    return { regions: selectedRegions, districts: selectedDistricts, cities: selectedCities };
  }

  const state = getDistrictState(districtId, selectedRegions, selectedDistricts, selectedCities);

  if (state.isSelected || state.isIndeterminate) {
    // Odznač okres
    // Ak bol región vybraný, treba ho rozbiť na ostatné okresy
    if (selectedRegions.includes(district.regionId)) {
      const allDistrictsInRegion = getDistrictsByRegion(district.regionId);
      const otherDistricts = allDistrictsInRegion.filter(d => d.id !== districtId);
      
      return normalizeSelection(
        selectedRegions.filter(r => r !== district.regionId),
        [...selectedDistricts.filter(d => d !== districtId), ...otherDistricts.map(d => d.id)],
        selectedCities.filter(c => !district.cities.includes(c))
      );
    }

    return normalizeSelection(
      selectedRegions,
      selectedDistricts.filter(d => d !== districtId),
      selectedCities.filter(c => !district.cities.includes(c))
    );
  } else {
    // Označ okres
    return normalizeSelection(
      selectedRegions,
      [...selectedDistricts, districtId],
      selectedCities.filter(c => !district.cities.includes(c))
    );
  }
}

/**
 * Toggle mesto - vracia nový stav.
 */
export function toggleCity(
  cityName: string,
  districtId: string,
  selectedRegions: string[],
  selectedDistricts: string[],
  selectedCities: string[]
): NormalizedSelection {
  const district = DISTRICTS[districtId];
  if (!district) {
    return { regions: selectedRegions, districts: selectedDistricts, cities: selectedCities };
  }

  const isSelected = isCitySelected(cityName, districtId, selectedRegions, selectedDistricts, selectedCities);

  if (isSelected) {
    // Odznač mesto
    // Ak bol okres vybraný, treba ho rozbiť na ostatné mestá
    if (selectedDistricts.includes(districtId)) {
      const otherCities = district.cities.filter(c => c !== cityName);
      return normalizeSelection(
        selectedRegions,
        selectedDistricts.filter(d => d !== districtId),
        [...selectedCities.filter(c => !district.cities.includes(c)), ...otherCities]
      );
    }

    // Ak bol región vybraný, treba ho rozbiť
    if (selectedRegions.includes(district.regionId)) {
      const allDistrictsInRegion = getDistrictsByRegion(district.regionId);
      const otherDistricts = allDistrictsInRegion.filter(d => d.id !== districtId);
      const otherCities = district.cities.filter(c => c !== cityName);
      
      return normalizeSelection(
        selectedRegions.filter(r => r !== district.regionId),
        [...selectedDistricts, ...otherDistricts.map(d => d.id)],
        [...selectedCities.filter(c => !district.cities.includes(c)), ...otherCities]
      );
    }

    return normalizeSelection(
      selectedRegions,
      selectedDistricts,
      selectedCities.filter(c => c !== cityName)
    );
  } else {
    // Označ mesto
    return normalizeSelection(
      selectedRegions,
      selectedDistricts,
      [...selectedCities, cityName]
    );
  }
}

// ============================================
// STATISTICS
// ============================================

/**
 * Počíta štatistiky výberu.
 */
export function getSelectionStats(selection: NormalizedSelection): {
  totalRegions: number;
  totalDistricts: number;
  totalCities: number;
  isAllSlovakia: boolean;
} {
  const allCities = expandToAllCities(selection);
  const allDistricts = expandToAllDistricts(selection);
  
  const totalRegions = selection.regions.length;
  const isAllSlovakia = totalRegions === Object.keys(REGIONS).length;

  return {
    totalRegions,
    totalDistricts: allDistricts.length,
    totalCities: allCities.length,
    isAllSlovakia,
  };
}
