# Zdroje dát a čo zobrazujeme

## Reálne z našich inzerátov (scraping)

- **Zoznam nehnuteľností** (`/dashboard/properties`): Všetky inzeráty z Bazoš, Nehnuteľnosti.sk, Reality.sk. Filtrovanie podľa mesta, ceny, plochy, zdroja, atď.
- **Cena, €/m², plocha, izby**: Priamo z inzerátov. Reálne.
- **Dashboard LIVE ticker**: Počet ponúk, zmena ceny (30d), priemerná €/m² (Bratislava alebo SK) – z našej DB, aktualizované z inzerátov.
- **Porovnanie s trhom** (detail nehnuteľnosti): Priemerná €/m² v meste z našich inzerátov. Reálne.
- **História cien** (timeline): Zmeny ceny z batch refresh / scraping. Reálne, ak sme inzerát viackrát skontrolovali.
- **„Dostupné u partnerov“ (duplicity)**: Podobné inzeráty (mesto, plocha ±10 %, cena ±15 %) z iných portálov. Počet zdrojov a úspora sú z našich dát.

## Odhadované / závislé na nájmoch

- **Výnos % (yield)** a **odhadovaný nájom**: Počítame z nájomných inzerátov (PRENAJOM) v tej istej lokalite. Ak nemáme dostatok PRENAJOM dát, yield sa nezobrazí (404 alebo „—“). Riešenie: scrapovať aj prenájmy a pridávať ich do DB.
- **Volatilita**: V analytických kartách vychádza z NBS + odhadovaných ukazovateľov (dopyt/ponuka), nie priamo z našich inzerátov.

## NBS a makro dáta

- **Analytické karty** (priem. výnos, BA cena/m², atď.): Z NBS (štvrťročné ceny) + statické odhady nájmov a „market indicators“. Nie priamo z našich listingov.
- **NBS** používame pre trendové a makro porovnanie; pre živé čísla z trhu slúži realtime API a dashboard ticker.

## Čo sa zmenilo (pre „reálne dáta“)

1. **Dashboard LIVE ticker**: Nahradený hardcoded hodnôt reálnymi z `/api/v1/market/realtime` (počet ponúk, zmena 30d, €/m²).
2. **Realtime štatistiky**: Pri regionoch sa pri vyhľadávaní používa case-insensitive match mesta (Bratislava vs BRATISLAVA).
3. **Fotky, detail nehnuteľnosti**: Opravy (proxy, fallback, hook order) – samostatné changelogy.

## Ako mať čo najviac reálnych metrík

- Pravidelne spúšťať scraping (Bazoš, Nehnuteľnosti, Reality) aby DB obsahovala aktuálne inzeráty.
- Scrapovať aj **prenájmy** (PRENAJOM), aby fungovali yield a odhad nájmu.
- Batch refresh zapnutý pre históriu cien a „dni na trhu“.

## Apify Webhook – batch upsert

- Webhook (`/api/webhooks/apify`) spracováva dáta **dávkovo**: prepare → bulk `findMany` → split create/update → chunkované `$transaction` (po 40).
- Obchádza timeout pri veľkých datasetch (140+ položiek): menej round-tripov, `maxDuration` 300s.
- Duplicity v datasete sa odfiltrujú podľa `externalId` a `sourceUrl` pred zápisom.

## AI Address Enrichment

- **Scraper**: Pre každý detail sa okrem `location` ukladá `raw_address_context` – text z `.top--location` (Nehnutelnosti) resp. lokality + prvých 200 znakov popisu (Bazoš, Reality).
- **Webhook**: Pre inzeráty s chýbajúcou alebo „podozrivou“ adresou (napr. „balkón“, „obývačka“ namiesto ulice) sa volá `enrichAddressWithAI` (Anthropic). AI vráti mesto, štvrť, ulicu, číslo; nevymýšľa.
- **Geocoding**: Výstup sa overuje cez Nominatim (Slovensko). Ak adresa neexistuje, loguje sa „Lokalita neoverená“, údaje sa aj tak použijú.
- Obmedzenia: max 30 enrichmentov na run, konkurrency 5 pre AI, sekvenčné verify s 1,1 s medzerou (rate limit).

## AI Realitný Analytik (Claude)

- **Každý inzerát** prechádza pred uložením cez `analyzeListing` (Claude 3.5 Sonnet). Vstup: celý popis + surová lokalita z Apify.
- **Brutálna extrakcia**: Iba fakty, žiadny marketing. JSON: `constructionType` (Tehla/Panel/Skelet/Neuvedené), `ownership` (Osobné/Družstevné/Štátne), `technicalCondition` (max 10 slov), `redFlags` (exekúcia, ťarcha, podiel, bez výťahu, drahý správca; inak null), `cleanAddress` (mesto, časť, ulica, číslo; žiadne „balkóny“), `investmentSummary` (jedna veta).
- **Zápis**: Výstupy sa mapujú na `Property`. Ak je `cleanAddress`, použije sa ako primárna adresa (city, district, street, address) a uloží sa aj do `aiAddress`.
- **Bezpečnosť**: `try-catch` okolo AI. Pri zlyhaní sa inzerát uloží v základnom formáte, scraping pokračuje.

## Zameranie na byty (Yield Engine)

- **Scraping**: Paginated scraper iba `byty/predaj` a `byty/prenajom` (50:50). Domy, pozemky vynechané.
- **Validácia**: Webhook a process-apify vyraďujú inzeráty s typom DOM/POZEMOK/KOMERCNE; ukladajú len **BYT**. Pri vytvorení sa nastaví `property_type` a `priority_score` (50 ak sú izby, 30 ak nie).
- **Yield Engine**: Porovnateľné nájmy sa hľadajú podľa mesta, okresu, izieb a plochy; scraper je zameraný na byty, takže PRENAJOM dáta sú z bytov.
- **UI**: Predvolený filter kategórie je **Byty**; v zozname je dropdown Byty / Domy / Pozemky / Komerčné / Všetky.
