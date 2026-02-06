/**
 * Hypotekárne úrokové sadzby pre Slovensko
 * Zdroj: ECB (MIR – úvery domácnostiam na bývanie), fallback NBS dokumenty
 * Použitie: porovnanie s výnosom, DSCR, náklady na financovanie
 */

// ECB Data Portal API (SDMX 2.1)
// MIR.M.SK.B.A2C = úvery domácnostiam na kúpu bývania (house purchase), Slovensko
const ECB_MIR_SK_HOUSE_PURCHASE =
  "https://data-api.ecb.europa.eu/service/data/MIR/M.SK.B.A2C.AM.R.A.2250.EUR.N";

export interface MortgageRateResult {
  ratePct: number;
  date: Date; // prvý deň obdobia (mesiac)
  source: "ECB" | "NBS";
}

/**
 * Získa poslednú dostupnú priemernú hypotekárnu úrokovú sadzbu pre SK (v %).
 * Skúsi ECB API, pri zlyhaní vráti null (neukladaj fallback do DB).
 */
export async function fetchSlovakMortgageRate(): Promise<MortgageRateResult | null> {
  try {
    const res = await fetch(ECB_MIR_SK_HOUSE_PURCHASE, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as EcbMirResponse;
    let best: { ratePct: number; periodKey: string } | null = null;

    const dataSet = data?.dataSets?.[0];
    const series = dataSet?.series;
    const obsDim = data?.structure?.dimensions?.observation;

    if (series && typeof series === "object") {
      for (const seriesKey of Object.keys(series)) {
        const obs = series[seriesKey]?.observations;
        if (!obs || typeof obs !== "object") continue;
        const keys = Object.keys(obs).sort((a, b) => Number(b) - Number(a));
        for (const key of keys) {
          const val = obs[key]?.[0];
          if (val == null) continue;
          const num = Number(val);
          if (Number.isNaN(num) || num < 0 || num > 20) continue;
          const periodStr = obsDim?.[0]?.values?.[Number(key)]?.id ?? key;
          if (!best || String(periodStr) > best.periodKey) {
            best = { ratePct: num, periodKey: String(periodStr) };
          }
        }
      }
    }

    if (!best && hasValue(data)) {
      const values = data.value;
      const lastNum = values.filter((v) => v != null && !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 20).pop();
      if (lastNum != null) {
        const idx = values.lastIndexOf(lastNum);
        const periodIds = (data?.structure?.dimensions?.observation?.[0] as { values?: Array<{ id?: string }> })?.values;
        const periodStr = periodIds?.[idx]?.id ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        best = { ratePct: Number(lastNum), periodKey: periodStr };
      }
    }

    if (!best) return null;

    let date = new Date();
    const m = best.periodKey.match(/^(\d{4})-(\d{2})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      const month = parseInt(m[2], 10);
      if (y && month >= 1 && month <= 12) date = new Date(Date.UTC(y, month - 1, 1));
    }

    return { ratePct: best.ratePct, date, source: "ECB" };
  } catch {
    return null;
  }
}

interface EcbMirResponse {
  value?: (number | string | null)[];
  structure?: {
    dimensions?: {
      observation?: Array<{ values?: Array<{ id?: string }> }>;
    };
  };
  dataSets?: Array<{
    series?: Record<string, { observations?: Record<string, [string | number] | undefined> }>;
  }>;
}

/** Type guard: ECB odpoveď môže mať pole value (SDMX variant). */
function hasValue(data: EcbMirResponse): data is EcbMirResponse & { value: (number | string | null)[] } {
  return Array.isArray((data as { value?: unknown }).value);
}
