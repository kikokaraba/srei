# Dáta pre investora do nehnuteľností – čo scrapovať a prečo

Prehľad dát, ktoré by mal investor mať pre štatistiky a porovnávanie. Označené je, čo SRIA už zbierá a čo je v pláne.

---

## 1. Živé trhové dáta (z inzerátov)

| Dáta | Zdroj | Stav | Použitie |
|------|--------|-----|----------|
| Cena, €/m², plocha, izby | Bazoš, Nehnutelnosti.sk | ✅ Scrapované | Porovnanie cien, priemer mesta, trendy |
| Počet ponúk, nové za 7d/30d | Naša DB | ✅ Realtime stats | Ponuka vs. dopyt, „horúcosť“ trhu |
| Priemerná cena/m² podľa mesta | Agregácia z Property | ✅ DailyMarketStats, getRealtimeMarketStats | Štatistiky, porovnanie s inzerátom |
| Výnos % (yield), odhad nájmu | PRENAJOM inzeráty (rovnaké portály) | ✅ Yield engine z prenájmov | Porovnanie výnosnosti |
| História ceny inzerátu | Batch refresh / detail scrape | ✅ PriceHistory | Trend ceny, dni na trhu |
| Duplicity („u partnerov“) | Viac zdrojov (BAZOS, NEHNUTELNOSTI) | ✅ Matching | Počet zdrojov, úspora |

**Odporúčanie:** Pravidelne cron pre scrape-all / scrape-paginated a batch refresh, aby DailyMarketStats a realtime mali plné dáta.

---

## 2. Oficiálne cenové indexy (NBS)

| Dáta | Zdroj | Stav | Použitie |
|------|--------|-----|----------|
| Ceny nehnuteľností podľa krajov (€/m²) | NBS | ⚠️ NBS scraper detekuje nové dáta, parsovanie Excel/PDF zatiaľ manuálne | Medziročné/medzištvrťročné trendy, porovnanie s „živým“ trhom |
| Index cien, zmena YoY/QoQ | NBS | Rovnaký zdroj | Makro trend, volatilita |

**Zdroj:**  
https://nbs.sk/statisticke-udaje/vybrane-makroekonomicke-ukazovatele/ceny-nehnutelnosti-na-byvanie/

**Odporúčanie:** Doimplementovať parsovanie NBS Excel/PDF do `nbs-scraper.ts` a zápis do `NBSPropertyPrice`, alebo manuálne dopĺňať po publikácii.

---

## 3. Hypotekárne úrokové sadzby

| Dáta | Zdroj | Stav | Použitie |
|------|--------|-----|----------|
| Priemerná úroková sadzba na hypotéky (SK) | ECB SDW (MIR), NBS | ✅ Fetcher + model MortgageRate | Náklady na financovanie, porovnanie s výnosom, DSCR |

**Zdroje:**  
- ECB: úrokové miery pre domácnosti – bývanie (MIR, Slovensko).  
- NBS: Banková úroková štatistika – úvery (Excel).

**Odporúčanie:** Cron mesačne volať `syncMortgageRates()`; zobraziť v dashboarde a v „investičnom súhrne“.

---

## 4. Ekonomické ukazovatele (ŠÚ / NBS)

| Dáta | Zdroj | Stav | Použitie |
|------|--------|-----|----------|
| HDP, inflácia, nezamestnanosť | ŠÚ DATAcube | ⚠️ Placeholder (prázdne) | Makro kontext, riziko trhu |
| Priemerná mzda, rast mzdy | ŠÚ | Rovnako | Odhad kupnej sily, nájom |
| Index cien v stavebníctve | ŠÚ | Placeholder | Náklady na rekonštrukciu |
| Dôvera spotrebiteľov | ŠÚ/ECB | Placeholder | Sentiment trhu |

**Zdroj:**  
https://data.statistics.sk/api/ (DATAcube). Kódy v `lib/data-sources/statistics-sk.ts` (GDP, inflácia, mzdy, bytová výstavba).

**Odporúčanie:** Doimplementovať volania DATAcube API podľa dokumentácie ŠÚ a zápis do `EconomicIndicator` (prípadne rozšíriť o ďalšie polia).

---

## 5. Demografia a výstavba

| Dáta | Zdroj | Stav | Použitie |
|------|--------|-----|----------|
| Obyvateľstvo mesta, zmena, migrácia | ŠÚ | Placeholder | Dopyt po bývaní |
| Dokončené byty, stavebné povolenia | ŠÚ | Placeholder | Budúca ponuka |

**Odporúčanie:** Naplniť `CityDemographics` a prípadne samostatnú tabuľku pre výstavbu z DATAcube.

---

## 6. Agregované trhové metriky (naša DB)

| Dáta | Zdroj | Stav | Použitie |
|------|--------|-----|----------|
| Priemer/medzián €/m², počet inzerátov, avg days on market | getAggregatedMarketData, realtime-stats | ✅ Z Property (ak máme NBS dáta alebo živé dáta z Property) | CityMarketData, dashboard |
| Demand/supply index | Agregátor / predictions | Čiastočne | Porovnanie trhov |

**Poznámka:** `getAggregatedMarketData()` dnes vychádza z NBS; ak NBS dáta chýbajú, vráti []. Pre čisto „živé“ štatistiky sa používajú `getRealtimeMarketStats()` a DailyMarketStats.

---

## Súhrn priorít pre scrapovanie

1. **Už beží:** Inzeráty (predaj + prenájom), daily/realtime štatistiky, yield z prenájmov, história cien.
2. **Vysoká priorita:** Hypotekárne sadzby (ECB/NBS) – implementované fetcherom + `MortgageRate`.
3. **Stredná priorita:** NBS ceny nehnuteľností – automatické parsovanie Excel/PDF do `NBSPropertyPrice`.
4. **Stredná priorita:** ŠÚ ekonomické ukazovatele (inflácia, mzdy) – naplniť `EconomicIndicator` z DATAcube.
5. **Nižšia priorita:** Demografia, výstavba – pre dlhodobé porovnania a regionálne štatistiky.

---

## API a cron

- **Realtime štatistiky:** `GET /api/v1/market/realtime`, widget Ekonomika (`type=economy-live`).
- **Sync dát:** `GET /api/cron/sync-data?type=nbs|economic|market|mortgage|all` (Bearer CRON_SECRET).
- **Hypotekárne sadzby:** `GET /api/v1/market-data?type=mortgage` – vráti `latest` + `history` (24 mesiacov). Sync: `sync-data?type=mortgage` alebo `type=all`.

---

## Porovnávanie a štatistiky (pre investora)

S týmito dátami môžeš napríklad:

- Porovnať **cenu inzerátu** s priemerom mesta (realtime alebo daily) a s **NBS indexom** kraja.
- Viesť **výnos** (yield) vs. **hypotekárna sadzba** (náklady na úver).
- Sledovať **zmenu ceny** (30d, 7d) a **počet nových inzerátov** ako indikátor aktivita trhu.
- V budúcnosti: **inflácia a mzdy** vs. rast cien a nájmov.
