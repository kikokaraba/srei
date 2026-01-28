import { describe, it, expect } from "vitest";
import { computeGrossYield } from "@/lib/analysis/yield-engine";

describe("Yield Engine", () => {
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
