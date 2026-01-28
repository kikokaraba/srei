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
