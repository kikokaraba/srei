# Scraping nehnuteľností – portály a nastavenie

SRIA scrapuje **iba z dvoch portálov**: **Nehnutelnosti.sk** a **Bazoš**.  
Scrapuje **len byty** v kategóriách **predaj** a **prenájom**, **celé Slovensko**.

---

## 1. Bazoš (reality.bazos.sk)

| Položka | Hodnota |
|--------|--------|
| **Zdroj v DB** | `PropertySource.BAZOS` |
| **Base URL** | `https://reality.bazos.sk` |
| **Typ** | Priamy HTTP + Cheerio |

**Kategórie:** byty predaj (`/predam/byt/`), byty prenájom (`/prenajmu/byt/`).  
**Implementácia:** `lib/scraper/simple-scraper.ts` → `scrapeBazos()`.

**Spúšťanie:**
- Cron: `GET /api/cron/scrape-bazos`
- Scrape-all: `GET /api/cron/scrape-all` (Bazoš + Nehnutelnosti.sk)
- Admin API: `POST /api/v1/admin/scraper` so zdrojom `BAZOS`
- Apify (celé Slovensko): `POST /api/cron/scrape-slovakia?portal=bazos`

**Detail inzerátu:** `lib/scraper/single-listing-scraper.ts` → `scrapeBazosDetail(url)`.

---

## 2. Nehnutelnosti.sk (www.nehnutelnosti.sk)

| Položka | Hodnota |
|--------|--------|
| **Zdroj v DB** | `PropertySource.NEHNUTELNOSTI` |
| **Base URL** | `https://www.nehnutelnosti.sk` |
| **Typ** | Priamy HTTP + Cheerio |

**Kategórie:** byty predaj (`/byty/predaj/`), byty prenájom (`/byty/prenajom/`).  
**Implementácia:** `lib/scraper/simple-scraper.ts` → `scrapeNehnutelnosti()`.

**Spúšťanie:**
- Cron: `GET /api/cron/scrape-nehnutelnosti`
- Scrape-all: `GET /api/cron/scrape-all`
- Scrape-paginated: `GET/POST /api/cron/scrape-paginated` (každých 10 min) – len Nehnutelnosti.sk
- Admin API: `POST /api/v1/admin/scraper` so zdrojom `NEHNUTELNOSTI`
- Apify: `POST /api/cron/scrape-slovakia?portal=nehnutelnosti`

**Detail inzerátu:** `scrapeNehnutelnostiDetail(url)` v `single-listing-scraper.ts`.

---

## Celé Slovensko (Apify + slovakia-scraper)

**Endpoint:** `POST /api/cron/scrape-slovakia`  
**Query:** `portal=nehnutelnosti` | `portal=bazos` | `portal=all` (oba portály), voliteľne `limit`.

**Targety** (`lib/scraper/slovakia-scraper.ts`):
- Nehnutelnosti.sk: byty predaj + prenájom – celé Slovensko + 8 krajov
- Bazoš: byty predaj + prenájom – celé Slovensko + 8 krajov

Výsledky prichádzajú cez webhook `/api/webhooks/apify`, spracovanie cez `process-apify`.

---

## Scrape-all

`GET /api/cron/scrape-all` – scrapuje **Bazoš + Nehnutelnosti.sk** (byty predaj + prenájom) cez `scrapeAll()` v simple-scraperi, ukladanie cez ingestion pipeline.

---

## Scrape-paginated

`GET/POST /api/cron/scrape-paginated` – **iba Nehnutelnosti.sk**, každých 10 min, postupne po stránkach (byty predaj, byty prenájom).

---

## Súhrn

| Portál | Cron | Scrape-all | Scrape-paginated | Apify | Admin API | Detail URL |
|--------|------|------------|------------------|-------|-----------|------------|
| **Bazoš** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Nehnutelnosti.sk** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Reality.sk a TopReality.sk nie sú v scrapingu podporované (len staré záznamy v DB môžu mať tieto zdroje).
