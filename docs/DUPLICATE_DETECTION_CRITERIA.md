# Kritériá rozpoznávania totožných nehnuteľností (SRIA)

Tento dokument popisuje, ako SRIA rozpoznáva **totožné / duplicitné** nehnuteľnosti pri scrapingu a pri manuálnom pridávaní. Cieľom je zabrániť duplikátom v databáze a správne prepojiť re-listingy (rovnaký inzerát s novým ID).

---

## 1. Úrovne matchingu (priorita od najsilnejšej)

### 1.1 Presná zhoda – **source + external_id**

**Kritérium:** Nehnuteľnosť sa považuje za **tú istú**, ak:

| Pole        | Podmienka |
|------------|-----------|
| `source`   | Rovnaký zdroj (BAZOS, NEHNUTELNOSTI, REALITY, TOPREALITY, MANUAL) |
| `external_id` | Rovnaké ID inzerátu z daného portálu (napr. číslo inzerátu, JuXXXXXXXX) |

**Použitie:**
- Pri scrapingu: ak už v DB existuje záznam s rovnakým `(source, external_id)`, ide o **update** existujúceho záznamu (aktualizácia ceny, popisu, fotiek, `last_seen_at`), nie o novú nehnuteľnosť.
- **Similarity score:** 100 (automatická zhoda).

**Poznámka:** `external_id` sa z URL inzerátu extrahuje (napr. z `/detail/12345/`, `/inzerat/123/`, `/detail/JuXXXXXXXX/`).

---

### 1.2 Zhoda podľa **source_url**

**Kritérium:** Nehnuteľnosť sa považuje za tú istú, ak:

| Pole         | Podmienka |
|--------------|-----------|
| `source_url` | Rovnaká absolútna URL inzerátu |

**Použitie:**
- V cron scrapingu (`/api/cron/scrape-nehnutelnosti`) sa pred vytvorením nového záznamu kontroluje `where: { source_url: prop.sourceUrl }`.
- Ak sa nájde záznam s rovnakou URL → považuje sa za **duplicitu**, nový záznam sa nevytvára (prípadne sa len aktualizuje existujúci).

**Poznámka:** `source_url` je často odvodená od `external_id`, takže v praxi sa čiastočne prekrýva s kritériom 1.1, ale pokrýva aj prípady, keď je URL kanonická a `external_id` by mohlo byť parsované rôzne.

---

### 1.3 Zhoda podľa **Property Fingerprint (hash)**

**Kritérium:** Nehnuteľnosť má rovnaký **fingerprint hash** ako nejaká existujúca v DB.

**Ako sa fingerprint počíta** (`createFingerprint` v `lib/matching/fingerprint.ts`):

| Vstupné pole   | Normalizácia / použitie |
|----------------|--------------------------|
| `city`         | Bez diakritiky, lowercase; kombinácia s district → `cityDistrict` (napr. `"Bratislava-Staré Mesto"`) |
| `district`     | Bez diakritiky, lowercase, súčasť `cityDistrict` |
| `address`      | Normalizovaná adresa: lowercase, bez diakritiky, bez PSČ, bez čísla domu; max prvých 50 znakov vstupuje do hash |
| `area_m2`      | Zaokrúhlené na rozsah (napr. 52 → `"50-60"`) → `areaRange` |
| `rooms`        | Presná hodnota alebo prázdne → `roomsRange` |
| `price`        | Zaokrúhlené na rozsah (napr. 120 000 → `"100000-125000"`) → `priceRange` (do hash nevstupuje pri štandardnom fingerprint hashi) |
| `floor`        | Rozsah: "unknown", "ground", "1-3", "4-6", "7+" → `floorRange` |

**Hash (fingerprintHash):**  
`MD5( cityDistrict + "|" + areaRange + "|" + roomsRange + "|" + prvých 50 znakov addressNormalized )`

**Použitie:**
- Ak pri ukladaní novej nehnuteľnosti existuje záznam v `PropertyFingerprint` s rovnakým `fingerprintHash` → považuje sa za **tú istú** nehnuteľnosť (typicky iný zdroj alebo re-listing s iným ID).
- **Similarity score:** 95.

---

### 1.4 Fuzzy matching (podobnosť podľa atribútov)

**Kritérium:** Nehnuteľnosť sa považuje za **možnú zhodu**, ak súčet bodov za podobnosť atribútov dosiahne aspoň **minimálnu hranicu** (v automatickom matchi **85** bodov). Body sa počítajú takto:

| Atribút        | Max bodov | Podmienka pre body |
|----------------|-----------|---------------------|
| **Mesto**      | 10        | Rovnaké mesto (case-insensitive, bez diakritiky). |
| **Okres / mestská časť** | 15 | Similarity (Levenshtein) ≥ 80 % → 15 bodov; ≥ 50 % → 8 bodov. |
| **Plocha (area_m2)** | 25 | „Podobná plocha“: rozdiel ≤ 2 m² alebo relatívny rozdíl ≤ 3 % → 25 bodov; rozdiel ≤ 5 m² → 15 bodov. |
| **Počet izieb** | 20       | Rovnaký počet izieb → 20 bodov; ak nie je známy u oboch → 5 bodov. |
| **Poschodie**  | 10        | Rovnaké poschodie → 10 bodov; rozdiel 1 → 5 bodov. |
| **Adresa**     | 20        | Similarity normalizovanej adresy ≥ 80 % → 20 bodov; ≥ 50 % → 10 bodov. |

**Normalizácia adresy:**  
Lowercase, bez diakritiky, odstránenie PSČ (5 číslic), čísla domov, stop-slov (ulica, ul., nám., atď.), zjednotenie medzier.

**Výber kandidátov pre fuzzy match:**
- Najprv sa z DB vyberú nehnuteľnosti s:
  - rovnakým `city` (case-insensitive),
  - plochou v rozsahu `area_m2 ± 5`,
  - rovnakým `rooms` (ak je zadané),
  - vylúčením vlastného `id` (ak ide o update).
- Pre týchto kandidátov sa spočítajú body podľa tabuľky; ak celkové skóre ≥ 85, najlepší kandidát sa považuje za **zhodu**.
- **Similarity score:** skutočné skóre 0–100 (min. 85 pre automatický match).

---

## 2. Rozpoznanie re-listingu

**Re-listing** = tá istá nehnuteľnosť sa znova objaví v ponuke (často s novým `external_id` po stiahnutí a znovu zverejnení).

**Podmienky:**
- Nájde sa zhoda podľa **1.1**, **1.3** alebo **1.4**.
- Zároveň existujúci záznam mal v čase poslednej kontroly stav:
  - `REMOVED`, `EXPIRED` alebo `WITHDRAWN`.
- A od posledného `last_seen_at` uplynulo **viac ako 7 dní**.

V takom prípade sa pri matchi nastaví `isReListing: true` a môže sa volať napr. `recordReListing()` pre zápis do `PropertyLifecycle`.

---

## 3. Zhrnutie kritérií (checklist)

| # | Kritérium | Typ | Kedy sa používa |
|---|-----------|-----|------------------|
| 1 | **source + external_id** | Presná zhoda | Scraping, import – primárna identifikácia inzerátu z daného portálu. |
| 2 | **source_url** | Presná zhoda | Scraping – kontrola pred vytvorením nového záznamu (napr. Nehnutelnosti.sk). |
| 3 | **fingerprintHash** | Hash zhoda | Po vytvorení fingerprintu – rovnaká nehnuteľnosť na rôznych portáloch alebo re-listing s iným ID. |
| 4 | **Fuzzy matching** (mesto, okres, plocha, izby, poschodie, adresa) | Podobnosť ≥ 85 bodov | Ak 1.1–1.3 neplatia – detekcia duplicít s mierne inými údajmi (preklepy, iný zápis adresy). |

---

## 4. Čo sa neberie ako rozlišovací znak

- **Cena** – pri fingerprint hashi nevstupuje do MD5 (cena sa mení), pri fuzzy matchi sa nehodnotí; duplicita sa teda neposudzuje podľa ceny.
- **Popis** – používa sa len `descriptionHash` (prvých 500 znakov) v rámci fingerprint dát; do hlavného **fingerprintHash** nevstupuje.
- **Fotky** – počet fotiek (`photo_count`) nie je súčasťou kritérií pre totožnosť; slúži skôr na ďalšiu analýzu alebo UX.

---

## 5. Odporúčania pre údržbu

1. **Jednoznačný identifikátor:** Vždy ukladať a parsovať `external_id` a `source` z každého zdroja; je to najspoľahlivejší spôsob rozpoznávania totožných inzerátov.
2. **source_url:** Ukladať kanonickú URL (bez zbytočných query parametrov) a pri scrapingu vždy kontrolovať duplicitu podľa `source_url` pred vytvorením nového `Property`.
3. **Fingerprint:** Po vytvorení alebo výraznej zmene nehnuteľnosti (adresa, plocha, mesto, okres, izby) prepočítať a uložiť fingerprint; batch job `generateMissingFingerprints()` dopĺňa chýbajúce fingerprinty.
4. **Fuzzy hranica:** Pre automatické zlučovanie ponechať min. similarity **85**; pre manuálny prehľad „možných duplicít“ môže byť nižšia (napr. 70).
5. **Re-listing:** Pri detekcii re-listingu aktualizovať existujúci záznam (cena, stav, `last_seen_at`) a voliteľne zaznamenať event do `PropertyLifecycle`.

---

## 6. Súvisiace modely v DB

- **Property** – `source`, `external_id`, `source_url`, `slug` (unikátny).
- **PropertyFingerprint** – `fingerprintHash`, `addressNormalized`, `cityDistrict`, `areaRange`, `roomsRange`, `priceRange`, `floorRange`, `titleNormalized`, `descriptionHash`.
- **PropertyMatch** – prepojenie dvoch nehnuteľností považovaných za tú istú (`primaryPropertyId`, `matchedPropertyId`, `matchScore`, `matchReason`, `isConfirmed`).
- **PropertyLifecycle** – záznam o „vymiznutí“ a prípadnom opätovnom objavení inzerátu (re-listing).

Tieto kritériá sú implementované v `lib/matching/fingerprint.ts`, v cron route `app/api/cron/scrape-nehnutelnosti/route.ts` (kontrola podľa `source_url` a `external_id`) a v stealth engine pri ukladaní scraped listingov.
