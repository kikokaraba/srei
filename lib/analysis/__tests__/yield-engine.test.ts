import { describe, it, expect } from "vitest";
import { computeGrossYield, computeInvestmentMetricsFromRent } from "@/lib/analysis/yield-engine";

describe("Yield Engine", () => {
  describe("computeInvestmentMetricsFromRent", () => {
    it("vráti gross_yield, net_yield, cash_on_cash, price_to_rent_ratio", () => {
      const m = computeInvestmentMetricsFromRent(100_000, 500);
      expect(m.gross_yield).toBe(6);
      expect(m.net_yield).toBeLessThan(m.gross_yield);
      expect(m.price_to_rent_ratio).toBeGreaterThan(0);
      expect(m.cash_on_cash).toBeGreaterThan(0);
    });
    it("cena 0 vráti nuly", () => {
      expect(computeInvestmentMetricsFromRent(0, 500)).toEqual({
        gross_yield: 0,
        net_yield: 0,
        cash_on_cash: 0,
        price_to_rent_ratio: 0,
      });
    });
  });

  describe("computeGrossYield", () => {
    it("100k byt, 500 €/mes → 6 % hrubý výnos", () => {
      expect(computeGrossYield(100_000, 500)).toBe(6);
    });

    it("200k byt, 800 €/mes → 4.8 %", () => {
      expect(computeGrossYield(200_000, 800)).toBe(4.8);
    });

    it("150k byt, 750 €/mes → 6 %", () => {
      expect(computeGrossYield(150_000, 750)).toBe(6);
    });

    it("cena 0 vráti 0", () => {
      expect(computeGrossYield(0, 500)).toBe(0);
    });

    it("nájom 0 vráti 0", () => {
      expect(computeGrossYield(100_000, 0)).toBe(0);
    });

    it("záporné hodnoty vráti 0", () => {
      expect(computeGrossYield(-100_000, 500)).toBe(0);
      expect(computeGrossYield(100_000, -500)).toBe(0);
    });
  });
});
