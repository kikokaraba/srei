/**
 * Property Matching Module
 * Exports all matching functionality
 */

export {
  removeDiacritics,
  normalizeAddress,
  normalizeTitle,
  getAreaRange,
  getPriceRange,
  getFloorRange,
  getDescriptionHash,
  getCityDistrict,
  createFingerprint,
  saveFingerprint,
  generateAndSaveFingerprint,
  generateMissingFingerprints,
} from "./fingerprint";

export type { FingerprintData } from "./fingerprint";

export {
  findMatchCandidates,
  saveMatch,
  runMatchingForNewProperties,
  getPropertyMatches,
  confirmMatch,
} from "./matcher";

export type { MatchCandidate, MatchReason, MatchResult } from "./matcher";

export {
  analyzeMatch,
  comparePropertiesWithAI,
  batchCompare,
  compareWithOpenAI,
  hybridMatch,
} from "./ai-matcher";

export type { AIMatchResult, PropertyComparisonInput } from "./ai-matcher";
