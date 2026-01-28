# Diagnostic Report: Nastavenia a preferencie používateľa

Prehľad schémy, frontendu, API a reálneho využitia preferencií v SRIA. Podklad pre „Investment Hunter“ a personalizovaný dashboard.

---

## 1. Analýza schémy

### Model `User`

| Pole | Typ | Popis |
|------|-----|--------|
| `id`, `email`, `password`, `emailVerified`, `name`, `image` | – | Základný profil |
| `role` | `UserRole` | `ADMIN` \| `PREMIUM_INVESTOR` \| `FREE_USER` |
| `preferences` | `UserPreferences?` | 1:1 preferencie |
| `subscription` | `Subscription?` | Predplatné (Stripe) |
| `dashboardLayout` | `DashboardLayout?` | Widgety dashboardu |
| `apiKeys` | `ApiKey[]` | API kľúče (Pro/Enterprise) |

**Poznámka:** V `User` nie sú žiadne „kredity“. Limity sú riešené cez `Subscription.plan` a `ApiKey.rateLimit`.

### Model `Subscription`

| Pole | Typ |
|------|-----|
| `plan` | `"FREE"` \| `"PREMIUM"` \| `"ENTERPRISE"` |
| `status` | `"ACTIVE"` \| `"CANCELLED"` \| `"PAST_DUE"` \| `"TRIALING"` |
| `stripeCustomerId`, `stripeSubscriptionId` | optional |
| `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd` | optional |

### Model `UserPreferences`

**Lokalita:** `primaryCity`, `trackedRegions`, `trackedCities`, `trackedDistricts`, `trackedStreets` (JSON polia).

**Investícia:** `investmentType`, `investmentTypes`, `minYield`, `maxYield`, `minPrice`, `maxPrice`, `minPricePerM2`, `maxPricePerM2`, `minArea`, `maxArea`, `propertyTypes`, `minRooms`, `maxRooms`, `condition`, `energyCertificates`, `minFloor`, `maxFloor`, `onlyDistressed`.

**Metriky:** `minGrossYield`, `maxGrossYield`, `minNetYield`, `maxNetYield`, `minCashOnCash`, `maxCashOnCash`, `maxPriceToRentRatio`, `maxDaysOnMarket`, `minPriceDrop`, `requirePriceHistory`.

**Urban / Gaps:** `minUrbanImpact`, `maxDistanceToInfra`, `infrastructureTypes`, `minGapPercentage`, `minPotentialProfit`.

**Daň:** `ownershipTypes`, `requireTaxExemption`.

**Notifikácie:** `notifyMarketGaps`, `notifyPriceDrops`, `notifyNewProperties`, `notifyUrbanDevelopment`, `notifyHighYield`, `notifyDistressed`, `notificationFrequency`.

**Dashboard:** `defaultView`, `itemsPerPage`, `sortBy`, `sortOrder`, `savedFilters`, `onboardingCompleted`.

**Telegram:** `telegramChatId`, `telegramUsername`, `telegramConnectedAt`, `telegramEnabled`.

### Model `DashboardLayout`

| Pole | Typ |
|------|-----|
| `widgets` | JSON – poradie widgetov |
| `hiddenWidgets` | JSON – skryté widgety |

Ukladá sa cez `/api/v1/dashboard/layout` (GET/POST).

---

## 2. Analýza frontendu a API

### Stránka nastavení: `app/dashboard/settings/page.tsx`

**Čo používateľ mení:**

- **Lokalita:** `LocationPickerV2` → `trackedRegions`, `trackedDistricts`, `trackedCities`
- **Typ investície:** multi-select (`investmentTypes`) + `minYield`, `maxPrice`
- **Notifikácie:** `notifyMarketGaps`, `notifyPriceDrops`, `notifyNewProperties`, `notifyUrbanDevelopment`
- **Uložiť:** tlačidlo „Uložiť zmeny“ volá `POST /api/v1/user/preferences`

**Uloženie:** Áno. Údaje sa posielajú na `POST /api/v1/user/preferences` a ukladajú sa do DB (Prisma `userPreferences.upsert`). Načítavanie cez `GET /api/v1/user/preferences` + React Query.

**UI:** Vlastný formulár (gradient karty, tlačidlá). Nie Shadcn/UI. Ďalšie bloky: `TelegramSettings`, `AdvancedFilters`.

### Pokročilé filtre: `AdvancedFilters`

- Načítava `useUserPreferences`, lokálny state `filters` (cena, plocha, izby, stav, energetická trieda, yield, …).
- **Uložiť:** volá `savePreferences` → `POST /api/v1/user/preferences` s mergom `preferences` + `filters`. Uloženie do DB prebehne.

### PropertyList (hlavný zoznam nehnuteľností)

- Používa `useUserPreferences`, ale výsledok je v kóde označený ako `_preferences` (nepoužíva sa).
- Filtre sú **lokálny state** (region, city, listingType, minPrice, maxPrice, …). Volá sa `/api/v1/properties/filtered` s týmito query parametrami.
- **Neposiela sa `usePreferences=true`.** Hlavný listing teda **nepoužíva uložené preferencie** – len manuálne filtre v UI.

### Kde sa preferencie reálne používajú

| Miesta | Použitie |
|--------|----------|
| **`/api/v1/properties/filtered`** | Ak `usePreferences=true`: regióny, okresy, mestá, `minPrice`, `maxPrice`, `minArea`, `maxArea`, `minRooms`, `maxRooms`, `condition` z DB |
| **`RecentProperties`** | Pri fetche nastavuje `usePreferences=true` → filtrovanie podľa uložených preferencií |
| **`MarketGaps`** | Posiela `trackedRegions`, `trackedDistricts`, `trackedCities` z preferencií do API |
| **`MarketOverview`** | používa `hasLocationPreferences` |
| **`PriceHistory`** | používa `trackedRegionCodes`, `hasLocationPreferences` |
| **`lib/monitoring/alerts`** | Kde stavby pre notifikácie: `minPrice`, `maxPrice`, `minArea`, `maxArea`, `minRooms`, `maxRooms`, `trackedCities` |
| **`WatchdogSettings`** | Načítava preferencie a používa ich na „watchdog“ konfiguráciu |
| **Telegram** | `notify*`, `telegramChatId`, atď. |

### Webhook (Apify)

- **Nepoužíva** `User` ani `UserPreferences`. Spracovanie je globálne, bez ohľadu na používateľa.

---

## 3. Súhrn: čo funguje, čo je len UI, čo chýba

### Čo funguje

- **UserPreferences** v DB, GET/POST `/api/v1/user/preferences` – načítavanie a ukladanie.
- **Settings page** – lokalita, typ investície, min yield, max cena, notifikácie sa ukladajú.
- **AdvancedFilters** – ukladanie pokročilých filtrov do preferencií.
- **Filtered API** – ak `usePreferences=true`, aplikuje preferencie (regióny, mestá, ceny, plochu, izby, stav).
- **RecentProperties, MarketGaps, MarketOverview, PriceHistory** – používajú preferencie (lokalita / usePreferences).
- **Alerts** – používajú preferencie na zostavenie `where` pre notifikácie.
- **Dashboard layout** – ukladanie/widgety cez `/api/v1/dashboard/layout`.
- **Telegram** – prepojené s preferenciami a notifikáciami.

### Čo je len „statické“ / nespojené

- **Hlavný zoznam nehnuteľností (`PropertyList`):** Filtre sú len lokálny state. **Uložené preferencie sa nepoužívajú** (žiadne `usePreferences=true`). Investor vidí predvolené filtre (napr. „Byty“, „Predaj“), nie svoje nastavenia zo Settings.
- **`useUserPreferences` v PropertyList** – v kóde sa nevyužíva (`_preferences`).

### Čo v DB je, ale v Settings UI chýba

- Veľa polí `UserPreferences` nie je v nastaveniach vôbec (len súčasný podmnožina). Napr. `minGrossYield`, `maxGrossYield`, `minCashOnCash`, `maxDaysOnMarket`, `minPriceDrop`, `minUrbanImpact`, `maxDistanceToInfra`, `infrastructureTypes`, `minGapPercentage`, `minPotentialProfit`, `ownershipTypes`, `requireTaxExemption`, `defaultView`, `itemsPerPage`, `sortBy`, `sortOrder`, `savedFilters` – sú v schéme a v POST handleri, ale v Settings stránke ani v AdvancedFilters nie sú všetky vystavené.

### Čo chýba pre „inteligentné“ notifikácie a personalizáciu

1. **Hlavný listing nepoužíva preferencie**  
   Aby „investičný dashboard“ odrážal nastavenia, treba napr.:
   - buď predvyplniť filtre v `PropertyList` z `useUserPreferences` a posielať ekvivalent do API,
   - alebo volať filtered API s `usePreferences=true` (podobne ako `RecentProperties`).

2. **Žiadna „Investment Hunter“ logika**  
   Okrem alerts a Watchdogu nie je jasne vyčlenený mód typu „notifikuj ma podľa presných investičných kritérií“ ani jeho prepojenie s UI.

3. **Kredity**  
   V schéme nie sú. Ak má byť napr. „X AI odhadov mesačne“, treba buď nové polia, alebo to riešiť cez `Subscription.plan` / externý systém.

4. **Prehľadnosť pre vývoj**  
   - Ktoré polia z UserPreferences sú reálne používané v kóde (filtered, alerts, watchdog, atď.).
   - Jednotný zdroj pravdy pre „aktivné“ filtre (či z preferencií, či z ad‑hoc volania).

---

## 4. Odporúčania pre ďalší krok

1. **Prepojiť PropertyList s preferenciami**  
   - Napr. predvyplniť region/city/minPrice/maxPrice/minYield z `useUserPreferences` pri prvom načítaní, alebo  
   - Pridať voliteľný režim „Použiť moje nastavenia“ (podobne ako `usePreferences=true`) a podľa toho volať filtered API.

2. **Doštrukturovať „Investment Hunter“**  
   - Jasne definovať, ktoré preferencie sa majú použiť na notifikácie / watchdogy.  
   - Rozšíriť Settings (alebo AdvancedFilters) len o tie polia, ktoré sa skutočne používajú, aby nevznikol „mŕtvy“ UI.

3. **Audit polí UserPreferences**  
   - Zoznam, ktoré sa reálne čítajú v backende (filtered, alerts, watchdog, Telegram).  
   - Ostatné buď začať používať, alebo dočasne považovať za legacy a nevyužívať v nových features.

4. **Testovanie**  
   - Zmena v Settings → uloženie → overiť, že RelevantProperties / MarketGaps / Alerts skutočne berú nové hodnoty (napr. zmena `trackedCities` alebo `minYield`).

---

## 5. Implementované zmeny (Investment Hunter)

- **User.aiCredits**: Pridané `aiCredits Int @default(5)` do schémy. Spusti `npx prisma db push` pri dostupnej DB.
- **PropertyList „Môj profil“**: Prepínač v hlavnom liste. Pri zapnutí sa volá filtered API s `usePreferences=true`; dashboard používa len nastavenia z Nastavení. Pri prvom načítaní sa filtre predvyplnia z preferencií (región, mesto, min yield, max cena).
- **Filtered API**: Pri `usePreferences=true` sa pre yield používajú `minYield` / `minGrossYield` a `maxYield` z preferencií, ak nie sú v query.
- **Investment Hunter v Nastaveniach**: Sekcia s `minGrossYield`, `onlyDistressed`, `minPriceDrop`, `minGapPercentage`. Ukladanie cez `POST /api/v1/user/preferences`.
- **Toast pri uložení**: Po uložení nastavení sa zobrazí „Investičný profil bol aktualizovaný“; ak je nastavený min. výnos, aj „Váš dashboard teraz prioritizuje ponuky s výnosom nad X%.“

---

## 6. Telegram Hunter Bot

- **`lib/telegram/hunter.ts`**: `sendHunterAlert`, `runHunterAlertsForProperty`, Hunter filter podľa `UserPreferences` (mesto, minYield, minGrossYield, minPriceDrop, minGapPercentage, onlyDistressed).
- **Formát správy**: HUNTER ALERT, mesto/izby, cena, výnos, podhodnotenie, zľava, AI verdikt, telefón, tlačidlá Otvoriť inzerát / SRIA.
- **Webhook**: Po create/update pre každú nehnuteľnosť volá `runHunterAlertsForProperty`; chyba pri odoslaní nepreruší spracovanie. Do `DataFetchLog` sa zapisuje `hunterAlertsSent`.
- **PRO vs FREE**: V kóde je komentár – PRO okamžite, FREE so 60-min delay (batch cron neskôr). Aktuálne sa notifikujú všetci používatelia s `telegramEnabled` + `telegramChatId`.
- **`TELEGRAM_BOT_TOKEN`** v `.env` (BotFather).

---

## 7. Partner Dashboard & Commission Engine

- **Rola `PARTNER`**: Pridaná do `UserRole`. Partner vidí v menu „Partner Panel“ (`/dashboard/partner`).
- **User**: `referredByUserId`, `partnerRef`, `iban`. **Commission**: `userId` (platiteľ), `partnerId`, `amount`, `status` (PENDING/PAID).
- **Registrácia**: `?ref=XXX` na `/auth/signup` → ak `XXX` = `partnerRef` alebo `id` PARTNERa, nastaví sa `referredByUserId`.
- **Partner dashboard**: referral link, aktívni odberatelia, dnešný zárobok, na výplatu, história provízií, výplatné údaje (IBAN, ref kód).
- **Commission engine**: `lib/commission/engine.ts` → `recordCommission(userId, amountEur)`. Pri platbe skontroluje `referredBy`, vytvorí Commission (10 %).
- **API**: `GET /api/v1/partner/stats`, `GET/PATCH /api/v1/partner/payout-details`, `POST /api/v1/commission/record` (admin).
- **Stripe**: Pri `invoice.paid` volať `recordCommission(userId, amountEur)` (webhook zatiaľ nie je implementovaný).

---

## 8. Investor Report (Admin)

- **`/admin/report`**: „The Money View“ pre investorov.
- **Market Arbitrage**: Bar chart (priem. trh vs. Hunter), widget „Celkový identifikovaný investičný potenciál (30 d)“.
- **Bot Performance**: Line chart Hunter alertov denne, „Average Discovery Speed“.
- **AI Efficiency**: % inzerátov s `investmentSummary`.
- **Referral ROI**: Tabuľka kódov (partner, privedení, konverzia, provízia). Generovanie kódu cez „Admin Magic“.
- **Admin Magic**: Vygenerovať referral kód (meno + % provízie), Global Credit Blast (kredity pre všetkých).
- **API**: `GET /api/v1/admin/report`, `POST /api/v1/admin/report/credit-blast`, `POST /api/v1/admin/report/referral`. Model `ReferralCode`.

---

*Report vygenerovaný na základe analýzy `prisma/schema.prisma`, `app/dashboard/settings/page.tsx`, `app/api/v1/user/preferences/route.ts`, `lib/hooks/useUserPreferences.ts`, filtered API, PropertyList, AdvancedFilters, alerts a súvisiaceho kódu.*
