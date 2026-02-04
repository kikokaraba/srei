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
  getCityAverageRent,
  computeGrossYield,
  computeInvestmentMetricsFromRent,
  compareToMarket,
  getYieldStats,
  type YieldData,
  type MarketComparison,
  type PriceToRentTrend,
} from "./yield-engine";
