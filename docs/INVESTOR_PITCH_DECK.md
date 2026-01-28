# SRIA — Investor Pitch Deck

Šablóna na prezentáciu pre prvého reálneho investora alebo referral partnera. Všetky čísla čerpaj z **Admin panelu** (`/admin`, `/admin/report`) alebo z API.

---

## Ako naplniť deck reálnymi dátami

1. **Admin prehľad** → [Dashboard](http://localhost:3000/admin): Nehnuteľnosti, Uložené, Alpha, Referral, Live vs NBS  
2. **Investor Report** → [/admin/report](http://localhost:3000/admin/report): Alpha graf, Hunter, AI, Referral leaderboard, Live vs NBS  
3. **Štaty** → [/admin/stats](http://localhost:3000/admin/stats): Používatelia, mesta, rast  

Môžeš screenshotovať widgety alebo exportovať čísla z API (`/api/v1/admin/stats`, `/api/v1/admin/report`).

---

## Slide 1 — Titulka

**SRIA — Slovenský Realitný Investičný Asistent**

*„Sledujeme stovky bytov. AI ti povie, ktoré majú skutočný potenciál.“*

- Web: [tvoja doména]
- Kontakt: [email]

---

## Slide 2 — Problém

- Investori strávia hodiny googlením, prezeraním nehnutelnosti.sk a bazos.sk  
- Ťažko zistia, či je cena férová, či nejde o predraženú zánovní bytovku  
- Chýba im **história cien** a **kontext**: „Tento byt evidujeme už 3 týždne — cena klesla o 5 %.“  

---

## Slide 3 — Riešenie: SRIA

- **Jedno miesto:** predaj + prenájom zo slovenských portálov (Nehnutelnosti, Bazoš, …)  
- **AI Analytik (Claude):** z popisu vytiahne vlastníctvo, stav, červené vlajky, verdikt — žiadny marketing, len fakty  
- **Yield Engine:** porovnanie ceny predaja vs. nájom v rovnakej kategórii → výnos v %  
- **Hunter:** upozornenia na príležitosti (Gap > X %, pokles ceny) — cez dashboard aj Telegram  
- **Mapa + filtre:** mesto, cena, výnos, typ nehnuteľnosti  

---

## Slide 4 — Dáta: náš najcennejší majetok

| Metrika | Zdroj | Čo povedať |
|--------|-------|------------|
| **Počet nehnuteľností** | Admin → Nehnuteľností | „Sledujeme **X** bytov v reálnom čase.“ |
| **Dnešné Alpha príležitosti** | Report → Alpha / Admin widget | „Dnes máme **Y** ponúk s Gap > 10 % a poklesom ceny > 5 %.“ |
| **Live vs NBS** | Report → Live vs NBS | „Náš priemer €/m² vs. NBS: **Z** % rozdiel — vieme, kde trh skutočne stojí.“ |
| **AI úspešnosť** | Report → AI | „**W** % nových inzerátov prešlo AI analytikom — čisté dáta, nie šum.“ |

*Odporúčanie: po migrácii a geocodingu použij skutočné čísla (napr. ~400 bytov).*

---

## Slide 5 — „Digitálna archeológia“ — prečo to má zmysel

- Staré inzeráty (Bazoš, staršie importy) mali často **bez adresy** alebo **adresa typu „Ružinov, kúsok od Billy“**.  
- **Riešenie:** AI (Claude) z textu extrahuje mesto, ulicu, obvod → Nominatim dá súradnice.  
- Výsledok: **mapa ožíva**, históriu cien máme aj pre staršie záznamy → väčšia dôvera investora.  

*„Neplytváme dátami — každý inzerát je súčasťou histórie trhu.“*

---

## Slide 6 — Hunter a okamžité príležitosti

- **Hunter Alerts:** používatelia s nastaveným profilom (mesto, min. výnos, min. pokles) dostanú notifikácie — cez dashboard aj Telegram.  
- **Dnešné Alpha príležitosti:** počet inzerátov, kde Gap > 10 % **a** Price Drop > 5 % (z Price History).  
- **Total Potential Alpha:** súčet potenciálneho zisku z Hunter ponúk (Report).  

*„Nečakáme, kým si sám prejdeš stovky inzerátov — upozorníme ťa na to podstatné.“*

---

## Slide 7 — Referral a partneri

- **Partner dashboard:** partnery (investičné skupiny) vidia svojich referovaných, provízie, výplatné údaje.  
- **Commission engine:** pri úspešnej platbe pre PRO používateľa → 10 % provízia pre partnera.  
- **Admin:** přehľad pending payout, leaderboard (kód, partner, referred, converted, commission).  

*„Môžeš prísť s vlastnou skupinou investorov — systém ti zaplatí za každú konverziu.“*

---

## Slide 8 — Čo uvidí investor v prvých 5 minútach

1. **Dashboard:** zoznam bytov (predaj / prenájom), filtre (mesto, cena, výnos), mapa.  
2. **Detail inzerátu:** fotky, cena, výnos, AI verdikt, TOP 3 fakty, „Volať hneď“ / „Pôvodný zdroj“.  
3. **Nastavenia:** Investment Hunter (min. výnos, min. pokles, Gap %), notifikácie, preferovaný región.  

*„Žiadny fluff — len to, čo potrebuje na rozhodnutie.“*

---

## Slide 9 — Cesta k 95 %+

- **Hotovo:** bulletproof webhook, AI analytik, Hunter + Telegram, migrácia starých dát, geocoding s AI, admin report, partner dashboard.  
- **Ďalší krok:** naplniť deck týmito reálnymi číslami z adminu a ukázať prvému investorovi.  

---

## Slide 10 — Call to action

- **Pre investora:** „Zaregistruj sa, nastav Huntera a skontroluj Dnešné Alpha príležitosti. Prvý nápad uvidíš hneď.“  
- **Pre partnera:** „Pridaj sa ako referral partner — dostaneš vlastný dashboard a provízie z každej konverzie.“  

**Kontakt:** [tvoj email / calendly / web]

---

## Quick reference — API metrík pre deck

| Číslo | API | Pole |
|-------|-----|------|
| Celkom nehnuteľností | `GET /api/v1/admin/stats` | `data.overview.totalProperties` |
| Celkom používateľov | `GET /api/v1/admin/stats` | `data.overview.totalUsers` |
| Dnešné Alpha | `GET /api/v1/admin/report` | `data.alpha.opportunitiesToday` |
| Total Potential Alpha (€) | `GET /api/v1/admin/report` | `data.alpha.totalPotentialAlpha` |
| Live vs NBS (%) | `GET /api/v1/admin/report` | `data.liveVsNbs.differencePercent` |
| AI efficiency (%) | `GET /api/v1/admin/report` | `data.ai.efficiencyPct` |
| Hunter alerts (30 d) | `GET /api/v1/admin/report` | `data.hunter.totalAlerts` |
| Referral pending (€) | `GET /api/v1/admin/report` | `data.referral.pendingPayout` |

---

*Po migrácii a geocodingu spusti `npm run db:audit-properties` a skontroluj Huntera v admin paneli. Potom nahraď placeholder čísla v tomto decku reálnymi hodnotami a máš pripravený **Investor Pitch**.*
