/**
 * Centrálny export všetkých konštánt
 * Použitie: import { CITY_LABELS, SLOVAK_CITIES, ... } from "@/lib/constants";
 */

// Labels a options pre UI
export {
  CITY_LABELS,
  CITY_OPTIONS,
  CONDITION_LABELS,
  CONDITION_OPTIONS,
  ENERGY_CERTIFICATE_LABELS,
  ENERGY_CERTIFICATE_OPTIONS,
  ROLE_LABELS,
  ROLE_OPTIONS,
  PORTFOLIO_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPE_OPTIONS,
  TRANSACTION_TYPE_LABELS,
  INVESTMENT_TYPE_LABELS,
  INVESTMENT_TYPE_OPTIONS,
  INFRASTRUCTURE_TYPE_LABELS,
  REGION_LABELS,
  REGION_OPTIONS,
  CITY_TO_REGION,
  getCityLabel,
  getConditionLabel,
  getRoleLabel,
  getRegionLabel,
  getCityRegion,
  getCityRegionLabel,
} from "./labels";

// Mestá s metrikami a koordinátami
export {
  SLOVAK_CITIES,
  TRACKED_CITIES,
  normalizeCityName,
  getCityCoordinates,
  getCityInfo,
  getMajorCities,
  getCitiesByRegion,
  isValidCity,
  getClosestCity,
  CITY_NAME_MAP,
  CITY_COORDS_MAP,
  CITY_ALIASES,
  type CityInfo,
} from "./cities";

// Regióny
export { SLOVAK_REGIONS, type RegionData } from "./regions";
