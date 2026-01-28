# SRIA – logika projektu, očakávania a realita

## 1. Čo je SRIA

**SRIA** = Slovenská Realitná Investičná Aplikácia.  
Platforma pre investovanie do nehnuteľností na Slovensku: agregácia inzerátov z viacerých portálov, filtre, metriky (výnos, cena/m², história cien) a AI nástroje.

---

## 2. Ako má logika fungovať (ideálny flow)

### 2.1 Pre návštevníka (bez účtu)

1. **Landing** (`/`) – predstavenie, štatistiky, mapa, cenník, CTA.
2. **Registrácia / prihlásenie** (`/auth/signup`, `/auth/signin`) – NextAuth (email + heslo, prípadne OAuth).
3. Po prihlásení redirect na **onboarding** alebo dashboard.

### 2.2 Onboarding (prvý vstup do appky)

1. **Onboarding** (`/onboarding`) – 5 krokov:
   - Kraje / regióny záujmu,
   - typ investície (výnos, flip, nájom, …),
   - rozsah ceny, plochy, izieb,
   - stav, energetika,
   - notifikácie (Market Gaps, cenové zmeny, nové inzeráty, urban development).
2. Uloženie do **UserPreferences** (trackedRegions, trackedCities, min/max price, …).
3. Nastavenie **onboardingCompleted = true**.
4. Ďalej len **dashboard**.

### 2.3 Dashboard a práca s inzerátmi

- **OnboardingGuard** obaľuje celý dashboard. Ak `onboardingCompleted === false`, používateľ ide na `/onboarding`; inak vidí dashboard.
- **Dashboard** (`/dashboard`):
  - Header s prepínačom **investičný / nájomný** režim a **LIVE ticker** (ponúky, zmena ceny, €/m²).
  - **CustomizableDashboard** – widgety (Hot Deals, Analytické karty, Prehľad trhu, Nedávne nehnuteľnosti, …) v ľubovoľnom poradí.

- **Vyhľadávanie** (`/dashboard/properties`):
  - Zoznam nehnuteľností z DB.
  - Filtre: mesto/kraj, cena, plocha, izby, zdroj (Bazoš, Nehnuteľnosti, Reality), stav, atď.
  - Ak je `usePreferences=true` (napr. „Nedávne nehnuteľnosti“), filtre sa doplnia z **UserPreferences** (trackedRegions → mestá, min/max price, …).
  - Zoradenie: dátum, cena, plocha, cena/m².
  - Klik na kartu → **detail nehnuteľnosti** (`/dashboard/property/[id]`).

- **Detail nehnuteľnosti**:
  - Základné údaje, cena, €/m², plocha, izby, fotky, popis.
  - **Yield** (výnos %), **odhadovaný nájom** (ak sú dáta).
  - **Porovnanie s trhom** (priemer €/m² v meste).
  - **História ceny** (timeline), **Dostupné u partnerov** (podobné inzeráty na iných portáloch).
  - Uložiť do **Sledované**, link na pôvodný inzerát.

- **Mapa** (`/dashboard/map`), **Sledované** (`/dashboard/saved`), **Portfólio**, **Kalkulačky**, **Analytika**, **AI Asistent**, **Nastavenia** – ďalšie nástroje podľa menu.

### 2.4 Dáta – odkiaľ majú prísť

1. **Scraping** – Bazoš, Nehnuteľnosti.sk, Reality.sk (byty/domy, predaj aj prenájom).
2. **Apify** – alternatívny zdroj (webhook + process-apify) pre tie isté portály.
3. **Ingestion pipeline** – normalizácia, fingerprint, upsert do DB (Property, PriceHistory, …).
4. **Batch refresh** – pravidelné kontroly existujúcich inzerátov (zmena ceny, zmazanie), čo živí históriu cien a „dni na trhu“.
5. **NBS / ŠÚ SR** – makro dáta (ceny za m² podľa regiónov), pre analytické karty a porovnanie.

---

## 3. Čo od projektu očakávaš (tvoje očakávania)

- **Jeden zoznam** všetkého, čo sa na Slovensku predáva alebo prenájima (vďaka scrapingu / Apify).
- **Registrácia** → nastavenie filtrov (lokalita, cena, výnos, …) → **zobrazenie len tých inzerátov, ktoré spĺňajú podmienky**.
- **Reálne dáta**:
  - cena za m²,
  - volatilita / čo sa predáva,
  - nájom,
  - výnos %,
  - na koľkých portáloch je inzerát (duplicity).
- Všetko to **pozorovať** v UI – žiadne „nefunguje“ / prázdne miesta.

---

## 4. Realita – čo funguje a čo nie

### 4.1 Čo funguje

| Čo | Kde | Poznámka |
|----|-----|----------|
| Registrácia, prihlásenie | `/auth/*` | NextAuth |
| Onboarding, preferencie | `/onboarding`, UserPreferences | Uloží kraje, cenu, notifikácie |
| Zoznam nehnuteľností | `/dashboard/properties` | Filtre, stránkovanie, grid/list |
| Filtrovanie podľa nastavení | API `filtered?usePreferences=true` | Napr. „Nedávne“ používa preferencie |
| Cena, €/m², plocha, izby | List, detail | Z DB, reálne z inzerátov |
| Fotky | List (thumbnails) | Cez image-proxy; fallback „Bez fotky“ |
| Detail nehnuteľnosti | `/dashboard/property/[id]` | Po opravách hookov a delenia nulou |
| Porovnanie s trhom | Detail | Priemer €/m² v meste z našich inzerátov |
| „Dostupné u partnerov“ | Detail | Podobné inzeráty (mesto, plocha ±10%, cena ±15%) z iných portálov |
| História ceny (timeline) | Detail | Ak máme PriceHistory z batch refreshu |
| LIVE ticker | Dashboard | Reálne z realtime API (počet ponúk, 30d zmena, €/m²) |
| Mapa, Sledované, Portfólio, Kalkulačky, AI, Nastavenia | Rôzne stránky | Podľa implementácie |

### 4.2 Čo nefunguje alebo nie je „reálne“

| Čo | Prečo |
|----|--------|
| **Výnos %** | Počíta sa z **nájomných** inzerátov (PRENAJOM) v lokalite. Málo alebo žiadne prenájmy v DB → yield 404 / „—“. |
| **Odhadovaný nájom** | To isté – potrebujeme PRENAJOM v DB. |
| **Volatilita** v analytických kartách | Z NBS + **pevné** odhady (dopyt/ponuka). Nie z našich inzerátov. |
| **„Na koľkých portáloch“** | Teraz sú to **podobné** inzeráty (iná plocha/cena), nie vždy ten istý inzerát na X weboch. Skutočné duplicity by chceli fingerprinting. |
| **Kompletný „všetok“ trh** | Scraping je obmedzený (kategórie, rate limit, blokovanie). Nie sme 100% pokrytie. |
| **Analytické karty** (priem. výnos, BA cena/m², …) | NBS + statické odhady. Nie live z našich listingov. |

### 4.3 Scraping a cron – ako to beží

- **Vercel cron** (ak máš crons zapnuté):
  - **scrape-paginated** (každých 10 min) – Nehnuteľnosti.sk, postupné stránky, byty/domy predaj + prenájom.
  - **batch-refresh** (každých 15 min) – kontroluje batch existujúcich inzerátov, aktualizuje ceny, detekuje predané.
  - **deduplicate**, **sync-data**, **check-nbs**, **daily-stats**, **cleanup-stale**, **telegram-notifications** – podľa schedule.
- **Apify** – cez webhook + process-apify, keď beh skončí. Dáta idú do tej istej DB.
- Na **Railway** je štart `db:auto-seed` + Next; crons sú typicky **Vercel**. Scraping teda beží tam, kde máš nastavené Vercel crons.

---

## 5. Záver – medzera medzi očakávaním a realitou

**Očakávanie:** Jeden zoznam celého trhu, svoje filtre, všetko reálne (€/m², výnos, nájom, volatilita, počet portálov) a všetko viditeľné v UI.

**Realita:**

- **Zoznam a filtre** – fungujú, dáta z Bazoš / Nehnuteľnosti / Reality. Pokrytie je len časť trhu.
- **Reálne €/m², cena, plocha, porovnanie s trhom, počet ponúk, zmena ceny** – máme z našich inzerátov a realtime API.
- **Výnos a nájom** – reálne len tam, kde máme dosť PRENAJOM v DB. Inak 404 / prázdne.
- **Volatilita** – z NBS/odhadov, nie z našich inzerátov.
- **„Koľko portálov“** – momentálne skôr „podobné inzeráty z iných portálov“, nie vždy presná duplicita toho istého inzerátu.

Ak chceš **čo najbližšie očakávaniam**:

1. Scrapovať aj **prenájmy** (PRENAJOM) a udržiavať ich v DB → výnos a odhad nájmu budú fungovať vo viac lokalitách.
2. Pravidelne behy scrapingu + batch refresh → aktuálny zoznam a zmysluplná história cien.
3. Prípadne doplniť **fingerprinting** pre skutočné duplicity „ten istý inzerát na X portáloch“ a v UI to explicitne uviesť.

Tento dokument má slúžiť ako jedna „source of truth“ pre logiku projektu, tvoje očakávania a reálny stav – pre ďalší vývoj aj pre debugging.
