# Audit: Prečo sa ~400 inzerátov nezobrazuje v dashboarde / mape

## 1. Data Consistency (property_type)

- **Problém**: Dashboard má default filter **Kategória = Byty** (`propertyType: "BYT"`). API `/api/v1/properties/filtered` pri `propertyType=BYT` nastaví `where.property_type = "BYT"`.
- **Dôsledok**: Záznamy s `property_type = null` (staré inzeráty) **sa pri tomto filtri nevracajú**.
- **Riešenie**: Hromadná migrácia `property_type = 'BYT'` pre `property_type IS NULL`:
  ```bash
  npx tsx scripts/migrate-fix-old-properties.ts [--dry-run]
  ```
  Alebo `npm run db:migrate-fix-old`.

---

## 2. Location (lat / lng)

- **Problém**: Mapové API (`getPropertiesForMap` → `/api/v1/properties/map`) vracia len nehnuteľnosti s `latitude` a `longitude` vyplnenými. Záznamy s `lat`/`lng` null **sa na mape nezobrazia**.
- **Riešenie**: Pre záznamy s textovou adresou, ale bez súradníc, spusti geocoding:
  ```bash
  npx tsx scripts/geocode-old-properties.ts [--dry-run] [--limit N]
  ```
  Skript používa `enrichAddressWithAI` (ak je `ANTHROPIC_API_KEY`) a Nominatim geocoding, potom uloží `latitude`/`longitude`.

---

## 3. Filter Debug (/api/v1/properties/filtered)

Overené podmienky v query:

| Podmienka | Použitie |
|----------|----------|
| `property_type` | Ak je `propertyType` v query (napr. BYT), nastaví sa `where.property_type = t`. **Null sa nezhoduje.** |
| `status` | **Nepoužíva sa** – filtered API nefiltruje podľa `ACTIVE` / iného statusu. |
| `is_active` | V schéme nie je; používa sa `status`. |
| Výnos (`minYield` / `maxYield`) | Aplikuje sa **až po fetchi**, v pamäti. Záznamy bez `investmentMetrics.gross_yield` prejdú len ak **nie je** nastavený `minYield` (resp. `minGrossYield` z preferencií). |

Žiadna ďalšia „skrytá“ podmienka (povinný yield, `is_active`) neblokuje zobrazenie v liste – **hlavný filter je `property_type`**.

---

## 4. Migračné skripty

1. **Audit** – zhrnutie stavu v `Property`:
   ```bash
   npm run db:audit-properties
   ```
2. **Migrácia property_type**:
   ```bash
   npm run db:migrate-fix-old        # bez --dry-run
   npx tsx scripts/migrate-fix-old-properties.ts --dry-run
   ```
3. **Geocoding starých inzerátov** (bez súradníc):
   ```bash
   npx tsx scripts/geocode-old-properties.ts [--dry-run] [--limit 50]
   npm run db:geocode-old            # default limit
   ```

---

## 5. Map API – úpravy

- Map API vracia aj `properties` (nie len `data`), aby komponenty čítajúce `data.properties` dostali zoznam.
- `getPropertiesForMap` vracia `price_per_m2` a `is_distressed` pre mapové komponenty.
- Podporované query parametre: `city`, `minPrice`/`priceMin`, `maxPrice`/`priceMax`, `listingType`, `limit`.

---

## 6. Ďalší krok: Investor Pitch

Po migrácii a naplnení dashboardu reálnymi dátami pozri **[Investor Pitch Deck](INVESTOR_PITCH_DECK.md)** — šablóna na prezentáciu pre prvého investora alebo referral partnera, s metrikami z Admin / Report.
