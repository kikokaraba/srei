# Scraping nehnuteľností – portály a nastavenie

Prehľad **z akých portálov** SRIA scrapuje inzeráty a **ako je to nastavené**. Každý zdroj je popísaný oddelene.

---

## 1. Bazoš (reality.bazos.sk)

| Položka | Hodnota |
|--------|--------|
| **Zdroj v DB** | `PropertySource.BAZOS` |
| **Base URL** | `https://reality.bazos.sk` |
| **Typ scrapingu** | Priamy HTTP + Cheerio (bez browsera) |

### Čo sa scrapuje
- **Kategórie:** byty predaj (`/predam/byt/`), byty prenájom (`/prenajmu/byt/`).
- **Stránky:** až 5 stránok na kategóriu (nastaviteľné v cron jobe).
- **Implementácia:** `lib/scraper/simple-scraper.ts` → `scrapeBazos()`.

### Kde sa spúšťa
- **Cron:** `GET /api/cron/scrape-bazos` – samostatný job len pre Bazoš.
- **Scrape-all:** `GET /api/cron/scrape-all` – spúšťa Bazoš + Nehnutelnosti.sk cez `scrapeAll()` v simple-scraperi.
- **Admin API:** `POST /api/v1/admin/scraper` so zdrojom `BAZOS` (používa sources + browserless/simple podľa konfigurácie).

### Ukladanie
- Duplicity: podľa `external_id` alebo `source_url`.
- Existujúci záznam: aktualizácia ceny + záznam do `PriceHistory`.
- Log: `DataFetchLog` so zdrojom `CRON_BAZOS`.

### Detail jedného inzerátu (podľa URL)
- **Single-listing scraper:** `lib/scraper/single-listing-scraper.ts` → `scrapeBazosDetail(url)`.
- Podporuje len Bazoš a Nehnutelnosti.sk; Reality/TopReality vracia „nie je podporovaný“.

---

## 2. Nehnutelnosti.sk (www.nehnutelnosti.sk)

| Položka | Hodnota |
|--------|--------|
| **Zdroj v DB** | `PropertySource.NEHNUTELNOSTI` |
| **Base URL** | `https://www.nehnutelnosti.sk` |
| **Typ scrapingu** | Priamy HTTP + Cheerio (listing), resp. detail na základe HTML |

### Čo sa scrapuje
- **Kategórie:** byty predaj (`/predaj/byty/`) – v simple-scraperi len táto; v scrape-paginated sú aj `byty/predaj` a `byty/prenajom`.
- **Stránky:** až 5 stránok na kategóriu v cron, 3 v scrape-all.
- **Implementácia:** `lib/scraper/simple-scraper.ts` → `scrapeNehnutelnosti()`.

### Kde sa spúšťa
- **Cron:** `GET /api/cron/scrape-nehnutelnosti` – samostatný job len pre Nehnutelnosti.sk.
- **Scrape-all:** `GET /api/cron/scrape-all` – Bazoš + Nehnutelnosti.sk.
- **Scrape-paginated:** `GET/POST /api/cron/scrape-paginated` – **iba Nehnutelnosti.sk**, postupne po 20 stránkach, s progressom v `ScrapeProgress` (kategórie byty-predaj, byty-prenajom).
- **Admin API:** `POST /api/v1/admin/scraper` so zdrojom `NEHNUTELNOSTI`.

### Špeciálne správanie
- Inzeráty **bez fotiek** sa pri prvom uložení preskakujú (lazy loading – scraper ich nevidí).
- Pri update sa doplňujú fotky, ak v DB chýbajú a scraper ich teraz našiel.
- **Scrape-paginated** beží podľa Vercel cron každých **10 minút** (`*/10 * * * *` v `vercel.json`).

### Ukladanie
- Duplicity: `external_id` alebo `source_url`.
- Log: `CRON_NEHNUTELNOSTI` alebo `paginated-scraper`.

### Detail jedného inzerátu
- `scrapeNehnutelnostiDetail(url)` v `lib/scraper/single-listing-scraper.ts`.

---

## 3. Reality.sk (www.reality.sk)

| Položka | Hodnota |
|--------|--------|
| **Zdroj v DB** | `PropertySource.REALITY` |
| **Base URL** | `https://www.reality.sk` |
| **Typ scrapingu** | Konfigurácia v Browserless + zdroje v `lib/scraper/sources/reality.ts` |

### Čo sa scrapuje
- **Kategórie (v konfigurácii):** byty predaj (`/byty/predaj/`), byty prenájom (`/byty/prenajom/`).
- **Implementácia:** `lib/scraper/browserless-scraper.ts` (PORTAL_CONFIGS.REALITY) a `lib/scraper/sources/reality.ts` (BaseScraper).

### Kde sa spúšťa
- **Admin API:** `POST /api/v1/admin/scraper` so zdrojom `REALITY` – volá sa zdrojový scraper (sources) alebo browserless.
- **Nie je** samostatný cron job typu `/api/cron/scrape-reality`.
- **Scrape-all** v súčasnosti volá len `scrapeAll()` v simple-scraperi, ktorý **scrapuje len Bazoš + Nehnutelnosti.sk** – Reality.sk tam nie je.

### Single-listing
- Podľa `single-listing-scraper.ts`: Reality.sk **nie je podporovaný** – vráti sa hláška „Portál momentálne nie je podporovaný“.

---

## 4. TopReality.sk (www.topreality.sk)

| Položka | Hodnota |
|--------|--------|
| **Zdroj v DB** | `PropertySource.TOPREALITY` |
| **Base URL** | `https://www.topreality.sk` |
| **Stav** | Len konfigurácia, **žiadna plná implementácia** |

### Nastavenie
- V `lib/scraper/browserless-scraper.ts` je `PORTAL_CONFIGS.TOPREALITY` (cesty napr. `/vyhladavanie/predaj/byty/`, `/vyhladavanie/prenajom/byty/`).
- V `lib/scraper/sources/index.ts` je `TOPREALITY: null` – **žiadny BaseScraper** (s komentárom „Planned for future implementation“).
- V Admin API je zdroj TOPREALITY s kategóriami, ale bez funkčného scrapera.

### Single-listing
- Rovnako ako Reality.sk – **nie je podporovaný**.

---

## 5. Scraping „celé Slovensko“ (Apify + slovakia-scraper)

| Položka | Hodnota |
|--------|--------|
| **Endpoint** | `POST /api/cron/scrape-slovakia` |
| **Query** | `portal=nehnutelnosti` \| `bazos` \| `all` (default nehnutelnosti), voliteľne `limit` |
| **Technológia** | Apify (Playwright) + rezidenčné SK proxy |

### Portály v Apify
- **nehnutelnosti** – Page function z `lib/scraper/nehnutelnosti-config.ts`.
- **bazos** – BAZOS_PAGE_FUNCTION.
- **reality** – REALITY_PAGE_FUNCTION (konfigurované, či sa naozaj používa v process-apify závisí od webhooku).

### Čo robí
- `lib/scraper/slovakia-scraper.ts` generuje **targety** (URL) pre:
  - Nehnutelnosti.sk (byty, domy, pozemky, komercne × predaj/prenajom, celé SK + po krajoch),
  - Reality.sk (rovnako),
  - Bazoš (byty, domy, pozemky, ostatne × kraje),
  - TopReality.sk (byty, rodinné domy, pozemky, komercne × predaj/prenajom).
- `triggerSlovakiaScraping()` v `lib/scraper/apify-service.ts` spustí Apify run pre zvolený portál (alebo všetky), s webhookom na `/api/webhooks/apify`. Výsledky sa spracúvajú cez `process-apify` (runId, portal).

### Kde sa volá
- Admin stránka „Scraping & Dáta“ – tlačidlo spustí napr. `scrape-slovakia?portal=nehnutelnosti&limit=10` a potom `process-apify` s runId.

---

## 6. Scrape-all (všetky portály naraz)

| Položka | Hodnota |
|--------|--------|
| **Endpoint** | `GET /api/cron/scrape-all` |
| **Čo reálne scrapuje** | **Len Bazoš + Nehnutelnosti.sk** cez `scrapeAll()` v `lib/scraper/simple-scraper.ts` |
| **Ukladanie** | Ingestion pipeline (`lib/scraper/ingestion-pipeline.ts`) – validácia, ScraperRun, detekcia duplicít, market gaps notifikácie. |

### Konfigurácia v route
- `maxPagesPerCategory: 3`
- `portals: ["BAZOS", "NEHNUTELNOSTI"]`
- Po skončení: volá sa `notifyUnnotifiedMarketGaps()` (Telegram).

### Cron
- V `vercel.json` **nie je** nastavený cron pre scrape-all (v komentári v kóde je návrh `0 3,15 * * *`).

---

## 7. Scrape-paginated (postupné stránky)

| Položka | Hodnota |
|--------|--------|
| **Endpoint** | `GET/POST /api/cron/scrape-paginated` |
| **Portál** | **Iba Nehnutelnosti.sk** |
| **Schedule** | Každých **10 minút** (`*/10 * * * *`) |

### Ako to funguje
- V DB je `ScrapeProgress` pre zdroj `NEHNUTELNOSTI` (kategória, aktuálna stránka, cycleCount).
- Každý run scrapne **20 stránok**, potom posunie progress (prípadne ďalšia kategória: byty-predaj → byty-prenajom → znova od začiatku).
- Parsovanie: regex na HTML (detail linky, ceny, plochy, thumbnaily).
- Po behu sa volá `runPostProcessing()` (days on market, metriky, odhad nájmu).

---

## Súhrn – ktorý portál kde beží

| Portál | Samostatný cron | Scrape-all | Scrape-paginated | Apify (Slovakia) | Admin API | Detail (single URL) |
|--------|------------------|------------|------------------|-------------------|-----------|---------------------|
| **Bazoš** | ✅ `/api/cron/scrape-bazos` | ✅ | ❌ | ✅ (portal=bazos) | ✅ | ✅ |
| **Nehnutelnosti.sk** | ✅ `/api/cron/scrape-nehnutelnosti` | ✅ | ✅ (iba tento) | ✅ (portal=nehnutelnosti) | ✅ | ✅ |
| **Reality.sk** | ❌ | ❌ | ❌ | ✅ (ak je v run) | ✅ (zdroj existuje) | ❌ |
| **TopReality.sk** | ❌ | ❌ | ❌ | v targetoch | ✅ (bez scrapera) | ❌ |

---

## Súbory na rýchly prehľad

- **Konfigurácia zdrojov (admin):** `app/api/v1/admin/scraper/route.ts` – `SCRAPER_SOURCES`, CITY_SLUGS.
- **Simple scraper (Bazoš + Nehnutelnosti):** `lib/scraper/simple-scraper.ts` – `scrapeBazos`, `scrapeNehnutelnosti`, `scrapeAll`.
- **Browserless (všetky 4 portály):** `lib/scraper/browserless-scraper.ts` – `PORTAL_CONFIGS`, `scrapePortal`.
- **Zdrojové scrapery (Bazoš, Nehnutelnosti, Reality):** `lib/scraper/sources/` – bazos, nehnutelnosti, reality; `getScraper()` v index.
- **Single listing (detail podľa URL):** `lib/scraper/single-listing-scraper.ts` – len Bazoš a Nehnutelnosti.
- **Slovakia-wide + Apify:** `lib/scraper/slovakia-scraper.ts`, `lib/scraper/apify-service.ts`, `lib/scraper/nehnutelnosti-config.ts`.
- **Cron routes:** `app/api/cron/scrape-bazos`, `scrape-nehnutelnosti`, `scrape-all`, `scrape-paginated`, `scrape-slovakia`, `process-apify`.
- **Vercel cron schedule:** `vercel.json` – crons (scrape-paginated každých 10 min, ostatné podľa zoznamu).

Tým máš všetky portály a ich nastavenie v jednom prehľade.
