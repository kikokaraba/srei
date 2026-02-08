# Scraping nehnuteľností – Apify

SRIA scrapuje **iba cez Apify** z dvoch portálov: **Nehnutelnosti.sk** a **Bazoš**.  
Scrapuje **len byty** (predaj + prenájom), **celé Slovensko** + kraje.

---

## Spúšťanie

| Spôsob | Endpoint / akcia |
|--------|------------------|
| **Cron (Vercel)** | `GET/POST /api/cron/scrape-slovakia` (napr. 0 3,15 * * *) |
| **Admin** | Admin → Data → Apify Scraper → Spustiť |
| **API** | `POST /api/v1/admin/scraper` (body: `{ "portals": ["nehnutelnosti", "bazos"] }`) |

Výsledky prichádzajú cez **webhook** `POST /api/webhooks/apify`; spracovanie je v tom istom endpointe alebo manuálne cez `GET /api/cron/process-apify?runId=...&portal=...`.

---

## Portály

| Portál | Zdroj v DB | Targety |
|--------|------------|--------|
| **Bazoš** | `BAZOS` | byty predaj/prenájom, celé SK + kraje |
| **Nehnutelnosti.sk** | `NEHNUTELNOSTI` | byty predaj/prenájom, celé SK + kraje |

Targety (URL kategórií) sú v `lib/scraper/slovakia-scraper.ts` (`getAllScrapingTargets`, `getTargetsByPortal`).  
Apify volá `lib/scraper/apify-service.ts` → `triggerSlovakiaScraping()`; page funkcie sú v `lib/scraper/nehnutelnosti-config.ts`.

---

## Premenné

- `APIFY_API_KEY` – povinné pre spúšťanie scrapingu
- `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL` – pre webhook URL

Reality.sk nie je v Apify flow; staré záznamy v DB môžu mať zdroj REALITY.

---

## Top Reality (Apify Store Actor)

Scraping TopReality.sk cez Apify Actor **appealing_jingle/top-reality-scraper**.

- **Spustenie:** `POST /api/cron/scrape-topreality`. Predvolene scrapuje **celé Slovensko** (všetky mestá z `SLOVAK_CITIES`). Body voliteľne: `village`, `type`, `maxRequestsPerCrawl`.
- **Webhook:** rovnaký endpoint `/api/webhooks/apify` s `portal: "topreality"`; dáta sa mapujú na `source: TOPREALITY`.
- **Vstup Actora:** jazyky, typ (predaj/prenájom), kategórie bytov, obce (village). Default: byty 2–4 izby, predaj, celé Slovensko (~70 miest), maxRequestsPerCrawl 500.
