// Analysis Module - Centrálny export

export {
  detectMarketGap,
  saveMarketGap,
  updateLiquidity,
  calculateLiquidityMetrics,
  updateStreetAnalytics,
  getTopMarketGaps,
} from "./market-logic";

export {
  calculatePropertyYield,
  calculateYieldForLocation,
  getComparableRents,
  compareToMarket,
  getYieldStats,
  type YieldData,
  type MarketComparison,
} from "./yield-engine";
