# Diagnostika: História cien a „pamäť trhu“

Prehľad toho, či SRIA skutočne buduje **časovú os** každého bytu a trhu, alebo len prepisuje aktuálne údaje.

---

## 1. Price Tracking (História cien)

### Čo máme

- **Model `PriceHistory`** v `prisma/schema.prisma`:
  - `propertyId`, `price`, `price_per_m2`, `recorded_at`
  - Samostatná tabuľka, nie pole na `Property`.
- Žiadne pole `priceChanges` (JSON) na Property – história je v `PriceHistory[]`.

### Záver

**Áno** – máme dedikovaný model pre históriu cien. Každý záznam = jeden bod na časovej osi (cena v čase).

---

## 2. Webhook logika (Apify) – prepis vs. história

### Čo sa deje v `app/api/webhooks/apify/route.ts`

**Nový inzerát (create):**

- Vytvorí sa `Property`.
- Ak `price > 0`, vytvorí sa **jeden** záznam `PriceHistory` s touto cenou → prvý bod na osi.

**Existujúci inzerát (update):**

- `Property` sa aktualizuje (nová cena prepíše starú v `price`, `price_per_m2`).
- **História sa neprepisuje.** Ak `existingPrice !== newPrice` a `price > 0`:
  - Vytvorí sa **nový** riadok v `PriceHistory` s novou cenou.
- Staré ceny zostávajú v `PriceHistory` – **pridávame, neprepisujeme**.

### Záver

**Áno** – pri zmene ceny ukladáme starú cenu do histórie (v podobe predchádzajúcich záznamov) a pridávame nový bod. Nestrácame časovú os.

---

## 3. Market Memory (Priemer mesta v čase)

### Čo máme

- **`DailyMarketStats`** (denné štatistiky):
  - `date`, `city`, `listingType`
  - `avgPrice`, `medianPrice`, **`avgPricePerM2`**, `medianPricePerM2`
  - `priceChangePercent` (zmena oproti včera), `listingsChangePercent`, …
  - Unique: `(date, city, listingType)` → jeden záznam na mesto/typ/deň.
- **`MonthlyMarketStats`** (mesačné):
  - `year`, `month`, `city`, `listingType`
  - `avgPricePerM2`, `priceChangePercent`, …
- `lib/analytics/market-stats.ts` počíta denné štatistiky z aktuálnych inzerátov, porovnáva s včerajškom a ukladá zmeny.

### Záver

**Áno** – existuje „pamäť trhu“: vieme povedať, aká bola priemerná cena za m² v meste (Bratislava, …) v daný deň / mesiac a ako sa menila (cez `priceChangePercent`).

---

## 4. Prediktívna pripravenosť – Yield Engine vs. trend

### Yield Engine (`lib/analysis/yield-engine.ts`)

- `calculatePropertyYield` používa **iba** `property.price` (aktuálnu cenu) a porovnateľné nájmy.
- **Nepoužíva** `PriceHistory`, ani `DailyMarketStats` / `MonthlyMarketStats`.
- `getYieldStats` vracia `priceToRentTrend: "STABLE"` – **natvrdo**, nie z dát (v kóde je TODO).

### Kde sa história a trend už používajú

| Miesto | Čo robí |
|--------|--------|
| **Predictions** (`/api/v1/predictions`) | Berie `priceHistory`, počíta trendy (1m, 3m, 1y), predikciu ceny (6m, 1y). |
| **Investor metrics** (`lib/analysis/investor-metrics.ts`) | Počet znížení ceny z `PriceHistory` → green flags, NegotiationPower (prvá vs. aktuálna cena). |
| **Property detail** (`/dashboard/property/[id]`) | Graf timeline z `priceHistory`, výpočet `priceChange` (prvá vs. aktuálna cena). |
| **Hunter / liquidity** | `minPriceDrop`, gap, liquidity – často vychádzajú z `priceHistory` alebo cenových zmien. |
| **Market Pulse (AI)** | Môže používať `DailyMarketStats` / `MonthlyMarketStats` pre kontext trhu. |

### Záver

- **Yield engine** – používa **iba** aktuálnu cenu, **nie** trend ani históriu.
- **Zvyšok systému** – časová os a trend sa už využívajú (predictions, investor metrics, detail, Hunter-relevantné metriky).

---

## 5. Zhrnutie a odporúčania

### Čo už funguje dobre

1. **PriceHistory** – pri create aj pri update (ak sa cena zmení) pridávame záznamy, neprepisujeme.
2. **DailyMarketStats / MonthlyMarketStats** – pamäť trhu (priemer €/m² v meste v čase).
3. **UI** – detail bytu používa históriu (timeline, zmena ceny).
4. **Predictions / investor metrics** – využívajú históriu a trend.

### Čo bolo doľahčené (po „upratovaní“ adminu)

1. **Yield engine – `priceToRentTrend`**
   - V `getYieldStats` sa trend odvodzuje z **MonthlyMarketStats** (PREDAJ, mesto napr. BRATISLAVA). Používa sa `priceChangePercent` alebo zmena `avgPricePerM2` medzi mesiacmi.
   - Ak nie sú dáta: vráti sa **`INSUFFICIENT_DATA`** (v UI zobrazovať ako „Nedostatok dát“). Už nie je natvrdo `"STABLE"`.
2. **Admin dashboard**
   - **Dnešné Alpha príležitosti**: počet inzerátov s Gap > 10 % a zároveň PriceDrop > 5 % (z `PriceHistory`). Dominantný widget na prehľade + v Investor Reporte.
   - **Live vs NBS**: jeden porovnávací graf (naša priemerná cena za m² vs. NBS). V Reporte sekcia „Live Market vs NBS“; na prehľade teaser s rozdielom v %.
   - **Referral – Na výplatu**: suma provízií so stavom PENDING. V Reporte aj na prehľade.
   - **Štatistiky (funnel)**: „Dokončili onboarding“ a „Uložili nehnuteľnosť“ z reálnych dát z DB (`onboardingCompletedCount`, `usersWithSavedCount`). Odstránený hardcoded „Dobrý“ a odhady.

### Čo ešte treba doľahčiť

1. **Yield engine – cenový odhad**
   - Pri výpočte yieldu zatiaľ stále len `property.price`. Do budúcna zvážiť „conservative“ odhad z trendu / histórie.
2. **Market benchmarking v yield**
   - Pri porovnaní s trhom použiť aj historické priemery (DailyMarketStats), nie len aktuálne agregáty z `Property`.
3. **AI Forecast (budúcnosť)**
   - Máme dáta: `PriceHistory` + Daily/Monthly stats. Pre „AI Forecast“ (napr. Claude + 3 mesiace histórie) je systém **pripravený** – treba len pridať logiku a UI (napr. v admin dashboard).

### Praktický checklist pre „milióne“

- [x] **Cenový graf (timeline)** – áno, detail bytu ho zobrazuje z `priceHistory`.
- [x] **Market benchmarking v čase** – áno, DailyMarketStats / MonthlyMarketStats.
- [ ] **Yield engine** – rozšíriť o trend / historický kontext.
- [ ] **AI Forecast** – napojenie na históriu + admin UI (zatiaľ nie je).

---

*Vygenerované ako diagnostika podľa požiadaviek na „časovú os“ a pamäť trhu.*
