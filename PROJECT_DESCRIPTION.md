# SRIA - Slovenská Realitná Investičná Aplikácia
## Kompletný popis projektu pre AI asistentov

---

## 🎯 Čo je SRIA?

**SRIA** (Slovenská Realitná Investičná Aplikácia) je prémiová, enterprise-grade webová aplikácia navrhnutá pre profesionálnych investorov do nehnuteľností na slovenskom trhu. Aplikácia poskytuje AI-powered insights, real-time trhové analýzy a pokročilé investičné nástroje, ktoré pomáhajú investorom identifikovať najlepšie príležitosti a maximalizovať výnosy.

**Cieľová skupina:** Profesionálni investori, realitné kancelárie, investičné fondy a jednotlivci hľadajúci inteligentné investičné rozhodnutia na slovenskom trhu nehnuteľností.

**Business model:** Freemium s tier systémom (Free, Premium €29/mesiac, Enterprise €99/mesiac)

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15.1.6 (App Router) s TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.4.17 s custom dark theme (FinTech/Bloomberg terminál štýl)
- **State Management:**
  - TanStack Query v5.62.11 (server state, caching, synchronization)
  - Zustand 5.0.2 (client state)
- **Mapy:** React Leaflet 4.2.1 + Leaflet 1.9.4 (interaktívne mapy Slovenska)
- **Icons:** Lucide React 0.468.0
- **Validation:** Zod 3.24.1

### Backend
- **Runtime:** Node.js 18+ (Next.js API Routes)
- **ORM:** Prisma 5.22.0 s PostgreSQL
- **Database:** PostgreSQL s PostGIS extension (geospatial queries)
- **Authentication:** NextAuth v5 (Auth.js beta 25) - JWT strategy
- **Security:**
  - Rate limiting: Upstash Redis 1.36.1
  - Input validation: Zod schemas
  - CSP headers v middleware

### DevOps & Tools
- **Deployment:** Vercel (production)
- **Database Management:** Prisma Studio, migrations
- **Type Safety:** TypeScript 5.7.2 (strict mode)

---

## 📁 Architektúra projektu

### Štruktúra adresárov

```
srei/
├── app/                          # Next.js App Router
│   ├── api/                     # API endpoints
│   │   ├── auth/                # NextAuth routes
│   │   └── v1/                  # Versioned API
│   │       ├── analytics/       # Market analytics
│   │       ├── liquidity/        # Liquidity tracker
│   │       ├── market-gaps/     # Market gaps detection
│   │       └── urban-development/ # Urban development data
│   ├── auth/                    # Auth pages (signin, error)
│   ├── dashboard/               # Protected dashboard pages
│   │   ├── analytics/           # Analytics dashboard
│   │   ├── comparison/          # Property comparison
│   │   ├── heatmap/             # Heatmap visualization
│   │   ├── properties/          # Property management
│   │   └── settings/            # User settings
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page
│   └── globals.css              # Global styles + Leaflet custom CSS
│
├── components/                   # React components
│   ├── dashboard/               # Dashboard-specific components
│   │   ├── AnalyticsCards.tsx   # KPI cards
│   │   ├── LiquidityTracker.tsx # Days on market tracker
│   │   ├── MarketGaps.tsx       # Market gaps display
│   │   ├── MarketOverview.tsx   # Market overview charts
│   │   ├── RecentProperties.tsx # Recent properties list
│   │   ├── ScenarioSimulator.tsx # What-if analysis tool
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   ├── TaxAssistant.tsx    # Tax calculator
│   │   └── UrbanDevelopment.tsx # Urban development tracker
│   ├── landing/                 # Landing page components
│   │   ├── CTA.tsx              # Call-to-action section
│   │   ├── Features.tsx         # Features showcase
│   │   ├── Hero.tsx             # Hero section
│   │   ├── HeroMap.tsx         # Interactive Slovakia map (Bloomberg-style)
│   │   ├── Navbar.tsx           # Navigation bar
│   │   ├── SlovakiaMap.tsx      # Legacy SVG map (deprecated)
│   │   └── Stats.tsx            # Statistics section
│   └── ErrorBoundary.tsx        # Error boundary component
│
├── lib/                         # Utility libraries
│   ├── auth.ts                 # NextAuth configuration
│   ├── constants/              # Constants
│   │   └── cities.ts           # Slovak cities data
│   ├── prisma.ts               # Prisma client singleton
│   ├── rate-limit.ts           # Rate limiting setup
│   ├── server-actions.ts       # Server actions
│   └── validations.ts          # Zod validation schemas
│
├── prisma/
│   └── schema.prisma           # Complete database schema
│
├── types/
│   └── next-auth.d.ts         # NextAuth type extensions
│
├── middleware.ts               # Next.js middleware (auth, security)
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
└── tsconfig.json               # TypeScript configuration
```

---

## 🗄️ Databázová schéma (Prisma)

### Hlavné modely

#### 1. **User** (Používatelia)
- Podpora pre 3 role: `ADMIN`, `PREMIUM_INVESTOR`, `FREE_USER`
- NextAuth integrované (Account, Session modely)
- Jeden používateľ môže mať viacero nehnuteľností

#### 2. **Property** (Nehnuteľnosti)
- Kompletný model pre slovenské nehnuteľnosti
- **Kľúčové polia:**
  - `city`: Enum (8 hlavných slovenských miest)
  - `district`: String (mestská časť/okres)
  - `street`: String? (pre Market Gaps analýzu)
  - `coordinates`: PostGIS Point (geospatial data)
  - `price`, `area_m2`, `price_per_m2`
  - `days_on_market`: Int (pre Liquidity Tracker)
  - `first_listed_at`: DateTime? (tracking času v ponuke)
- **Relations:**
  - `investmentMetrics` (1:1)
  - `priceHistory` (1:N)
  - `marketGaps` (1:N)
  - `propertyImpacts` (1:N - urban development)
  - `taxInfo` (1:1)

#### 3. **MarketAnalytics** (Trhové analýzy)
- Agregované dáta na úrovni mesta
- `avg_price_m2`, `avg_rent_m2`, `yield_benchmark`, `volatility_index`
- Indexované podľa `[city, timestamp]`

#### 4. **InvestmentMetrics** (Investičné metriky)
- Vypočítané metriky pre každú nehnuteľnosť
- `gross_yield`, `net_yield`, `cash_on_cash`, `price_to_rent_ratio`

#### 5. **PriceHistory** (História cien)
- Sledovanie zmien cien v čase
- Používa sa pre Liquidity Tracker
- Indexované podľa `[propertyId, recorded_at]`

#### 6. **StreetAnalytics** (Analýza ulíc)
- Agregované dáta na úrovni ulice
- `avg_price_m2`, `median_price_m2`, `property_count`
- Unique constraint: `[city, district, street]`
- Používa sa pre Market Gaps detekciu

#### 7. **MarketGap** (Detekované príležitosti)
- Automaticky detekované podhodnotené nehnuteľnosti
- `gap_percentage`: O koľko % je pod priemerom (threshold: 15%)
- `potential_profit`: Odhadovaný zisk pri flipe
- `notified`: Boolean (tracking notifikácií)

#### 8. **UrbanDevelopment** (Urbanistický rozvoj)
- Plánovaná infraštruktúra (metro, električky, diaľnice, atď.)
- `type`: Enum (8 typov infraštruktúry)
- `expected_impact`: Očakávaný vplyv na ceny v %
- `status`: "planned", "in_progress", "completed"
- PostGIS Point pre geolokáciu

#### 9. **PropertyImpact** (Vplyv na nehnuteľnosti)
- Prepojenie nehnuteľností s urban development projektmi
- `distance_meters`: Vzdialenosť od infraštruktúry
- `estimated_appreciation`: Odhadované zhodnotenie

#### 10. **TaxInfo** (Daňové informácie)
- Daňové výpočty pre nehnuteľnosti
- `purchase_date`, `purchase_price`
- `is_primary_residence`: Oslobodenie od dane
- `ownership_type`: "individual", "sro", "spolocnost"
- `depreciation_group`: Pre s.r.o. (1-6 skupín)
- `tax_exemption_date`: 5-ročný test

---

## 🔌 API Endpoints

### `/api/v1/analytics/snapshot` (GET)
**Popis:** Vráti snapshot trhových analýz pre hlavné slovenské mestá

**Autentifikácia:** Vyžadovaná (NextAuth session)

**Rate Limiting:** Áno (Upstash Redis)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "city": "BRATISLAVA",
      "avg_price_m2": 3200,
      "avg_rent_m2": 12.5,
      "yield_benchmark": 4.7,
      "volatility_index": 0.35,
      "properties_count": 1247,
      "trend": "stable"
    }
  ],
  "timestamp": "2026-01-23T..."
}
```

**Status:** ✅ Implementované (momentálne mock dáta)

---

### `/api/v1/market-gaps` (GET)
**Popis:** Detekuje podhodnotené nehnuteľnosti porovnaním s priemerom v ulici

**Autentifikácia:** Vyžadovaná

**Logika:**
1. Aktualizuje `StreetAnalytics` pre všetky ulice
2. Nájde nehnuteľnosti bez existujúceho `MarketGap` záznamu
3. Porovná cenu s priemerom v ulici
4. Ak je gap ≥ 15%, vytvorí `MarketGap` záznam
5. Vypočíta potenciálny zisk (80% z gapu)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "gap_percentage": 18.5,
      "potential_profit": 25000,
      "street_avg_price": 2100,
      "detected_at": "2026-01-23T...",
      "property": {
        "id": "...",
        "title": "2-izbový byt, Ružinov",
        "address": "...",
        "price": 135000,
        "price_per_m2": 1710,
        "area_m2": 79,
        "rooms": 2
      }
    }
  ],
  "count": 5
}
```

**Status:** ✅ Implementované (s error handling pre nedostupnú databázu)

---

### `/api/v1/liquidity` (GET)
**Popis:** Sleduje "čas na trhu" - dni v ponuke a zmeny cien

**Query Parameters:**
- `propertyId` (optional): Konkrétna nehnuteľnosť
- `city` (optional): Všetky nehnuteľnosti v meste

**Autentifikácia:** Vyžadovaná

**Logika:**
- Vypočíta `days_on_market` z `first_listed_at` alebo `createdAt`
- Porovná aktuálnu cenu s `PriceHistory`
- Identifikuje zmeny cien a počet dní od zmeny

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "propertyId": "...",
      "title": "3-izbový byt, Banská Bystrica",
      "address": "...",
      "days_on_market": 84,
      "current_price": 145000,
      "price_change": {
        "price_diff": -7500,
        "price_diff_percent": -4.9,
        "days_since_change": 10,
        "changed_at": "2026-01-13T..."
      }
    }
  ],
  "count": 12
}
```

**Status:** ✅ Implementované

---

### `/api/v1/urban-development` (GET)
**Popis:** Vráti dáta o plánovanej infraštruktúre a jej vplyve na nehnuteľnosti

**Query Parameters:**
- `propertyId` (optional): Projekty v blízkosti nehnuteľnosti
- `city` (optional): Všetky projekty v meste

**Autentifikácia:** Vyžadovaná

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Stanica metra Nové Mesto",
      "type": "METRO_STATION",
      "city": "BRATISLAVA",
      "district": "Nové Mesto",
      "status": "planned",
      "planned_completion": "2028-06-01T...",
      "expected_impact": 20.0,
      "_count": {
        "propertyImpacts": 15
      }
    }
  ],
  "count": 8
}
```

**Status:** ✅ Implementované

---

## 🎨 Frontend Komponenty

### Landing Page Komponenty

#### **Hero.tsx**
- Hlavný hero section s gradient textom
- Tagline: "Slovenská realitná investičná aplikácia"
- CTA tlačidlá (Začať, Pozrieť demo)
- Badge: "Prémiová investičná platforma"

#### **HeroMap.tsx** ⭐ (Kľúčový komponent)
**Bloomberg terminál štýl mapa Slovenska**

**Technológie:**
- React Leaflet s dynamickým importom (`ssr: false`)
- CartoDB Dark Matter tile layer (`dark_nolabels` - bez nápisov okolitých krajín)
- Custom DivIcon markery namiesto štandardných kruhov

**Funkcie:**
- **Presné súradnice krajov:**
  - BA: [48.1485, 17.1077]
  - TT: [48.3775, 17.5855]
  - TN: [48.8945, 18.0445]
  - NR: [48.3061, 18.0764]
  - ZA: [49.2231, 18.7398]
  - BB: [48.7352, 19.1459]
  - PO: [48.9981, 21.2339]
  - KE: [48.7164, 21.2611]

- **Custom markery:**
  - Tmavý obdĺžnik (`#0f172a`) s bielym textom
  - Formát: `[SKRATKA] [VÝNOS]%` (napr. "NR 5.7%")
  - Pulzujúci bod pod obdĺžnikom (Tailwind `ping` animácia)
  - Farba bodu:
    - `#10b981` (emerald) ak výnos > 5%
    - `#f43f5e` (rose) ak výnos < 4%
    - `#fbbf24` (zlatá) pre stredné výnosy

- **Interaktivita:**
  - Kliknutie na marker → plynulý scroll na sekciu "Funkcie"
  - Popup s detailom kraja pri hover/kliknutí
  - `attributionControl={false}` (čistý pravý dolný roh)

- **Fallback:**
  - Ak GeoJSON zlyhá, zobrazí aspoň markery na krajských mestách
  - Pulzujúce animácie pre vizuálnu atraktivitu

**Mock dáta:**
```typescript
REGION_DATA = {
  "Bratislavský kraj": { avgPrice: 3800, avgYield: 3.8, trend: "up" },
  "Trnavský kraj": { avgPrice: 2100, avgYield: 4.9, trend: "up" },
  "Nitriansky kraj": { avgPrice: 1650, avgYield: 5.7, trend: "down" },
  // ... atď.
}
```

**Status:** ✅ Plne implementované a funkčné

---

#### **Stats.tsx**
- Štatistiky (počet nehnuteľností, priemerný výnos, atď.)
- Animated counters

#### **Features.tsx**
- 6 hlavných funkcií aplikácie
- Icons z Lucide React
- Gradient farby (emerald, gold, slate)

#### **CTA.tsx**
- Call-to-action sekcia
- "Začnite ešte dnes" messaging
- Free trial info

#### **Navbar.tsx**
- Responsive navigation
- Logo "SRIA"
- Menu: Funkcie, Mapa, Cenník, Prihlásiť sa, Začať

---

### Dashboard Komponenty

#### **MarketGaps.tsx** ⭐
**Index "Skrytého potenciálu"**

**Funkcie:**
- Zobrazuje detekované podhodnotené nehnuteľnosti
- Push notification štýl karty
- Zobrazuje:
  - Gap percentage (napr. "18.5% pod priemerom")
  - Potenciálny zisk (napr. "25 000 €")
  - Priemernú cenu v ulici
  - Detail nehnuteľnosti

**API:** `/api/v1/market-gaps`

**Status:** ✅ Implementované

---

#### **LiquidityTracker.tsx** ⭐
**"Čas na trhu" Tracker**

**Funkcie:**
- Stopky: "V ponuke: 84 dní"
- Zmeny cien: "Cena klesla pred 10 dňami o 5%"
- Indikátor zúfalosti (90+ dní = vysoký potenciál na vyjednávanie)
- Zoradené podľa dní v ponuke (najdlhšie prvé)

**API:** `/api/v1/liquidity`

**Status:** ✅ Implementované

---

#### **ScenarioSimulator.tsx** ⭐
**Simulátor scenárov (What-if analýza)**

**Interaktívne posuvníky:**
- Cena nehnuteľnosti (50k - 500k €)
- Mesačný nájom (200 - 2000 €)
- Úroková sadzba (2% - 8%)
- Záloha (10% - 50%)
- Doba splácania (10 - 30 rokov)
- Výpadok nájmu (0% - 25%)
- Mesačné náklady (0 - 500 €)

**Výpočty:**
- Mesačná splátka hypotéky (anuitná splátka)
- Cash-on-Cash Return
- Hrubý a čistý výnos
- Break-even nájom (minimálny nájom na pokrytie nákladov)
- Ročný príjem po výpadku a nákladoch

**Vizuálne indikátory:**
- Zelená/červená farba podľa pozitívneho/negatívneho výsledku
- TrendingUp/TrendingDown ikony

**Status:** ✅ Plne funkčné

---

#### **UrbanDevelopment.tsx** ⭐
**Urbanistický rozvoj tracker**

**Funkcie:**
- Zobrazuje plánovanú infraštruktúru
- Typy: Metro, Električka, Diaľnica, Nákupné centrum, Škola, Nemocnica, Park, Obchodná zóna
- Status: Plánované, V výstavbe, Dokončené
- Očakávaný vplyv na ceny (napr. "+20% zhodnotenie")
- Počet ovplyvnených nehnuteľností

**API:** `/api/v1/urban-development`

**Status:** ✅ Implementované

---

#### **TaxAssistant.tsx** ⭐
**Daňový a právny asistent**

**Funkcie:**
- **5-ročný test:** Vypočíta, kedy uplynie oslobodenie od dane
- **Daň z predaja:** 19% z zdaniteľného zisku
- **Odpisy pre s.r.o.:**
  - 6 odpisových skupín (1-6)
  - Ročný a celkový odpis
  - Zdaniteľný zisk po odpisoch
- **Čistý zisk po dani**

**Input parametre:**
- Dátum kúpy a predaja
- Kúpna a predajná cena
- Hlavné bydlisko (oslobodenie)
- Typ vlastníctva (fyzická osoba / s.r.o.)
- Odpisová skupina (pre s.r.o.)

**Status:** ✅ Plne funkčné

---

#### **AnalyticsCards.tsx**
- KPI karty (priemerný výnos, počet nehnuteľností, atď.)
- Gradient farby, animácie

#### **MarketOverview.tsx**
- Prehľad trhu (charts, grafy)
- Trend analýzy

#### **RecentProperties.tsx**
- Zoznam nedávno pridaných nehnuteľností
- Quick actions

#### **Sidebar.tsx**
- Navigácia dashboardu
- Dark theme
- Active state highlighting

---

## 🎯 Implementované funkcie

### ✅ 1. Index "Skrytého potenciálu" (Market Gaps)
- Automatická detekcia podhodnotených nehnuteľností
- Porovnanie s priemerom v ulici (15% threshold)
- Push notifikácie s potenciálnym ziskom
- API endpoint + Frontend komponent

### ✅ 2. "Čas na trhu" (Liquidity Tracker)
- Sledovanie dní v ponuke
- Zmeny cien v čase
- Indikátor zúfalosti (90+ dní)
- API endpoint + Frontend komponent

### ✅ 3. Simulátor scenárov (What-if analýza)
- Interaktívne posuvníky pre všetky parametre
- Výpočet mesačnej splátky, cash-on-cash return, výnosov
- Break-even analýza
- Simulácia výpadku nájmu a zmien úrokových sadzieb
- Frontend komponent (100% client-side)

### ✅ 4. Urbanistický rozvoj (Future Growth)
- Prepojenie s územnými plánmi
- Zobrazenie plánovanej infraštruktúry
- Odhad zhodnotenia nehnuteľností
- API endpoint + Frontend komponent

### ✅ 5. Daňový a právny asistent (Slovak Context)
- 5-ročný test na oslobodenie od dane
- Výpočet dane z predaja (19%)
- Odpisy pre s.r.o. (6 skupín)
- Čistý zisk po dani
- Frontend komponent (100% client-side)

### ✅ 6. Interaktívna mapa Slovenska (Bloomberg terminál štýl)
- Custom DivIcon markery s pulzujúcimi bodmi
- Presné súradnice krajov
- Tmavá mapa bez nápisov okolitých krajín
- Interaktivita (scroll na sekciu, popup)

---

## 🔐 Bezpečnosť

### Middleware (`middleware.ts`)
- Zero Trust princípy
- Session validácia
- CSP headers
- Protected routes (dashboard)

### Rate Limiting
- Upstash Redis
- Konfigurované pre API endpointy
- IP-based limiting

### Authentication
- NextAuth v5 (JWT strategy)
- Credentials provider
- Session management
- Role-based access (UserRole enum)

---

## 📊 Aktuálny stav projektu

### ✅ Dokončené
1. **Základná architektúra**
   - Next.js 15 App Router setup
   - Prisma schema s kompletnými modelmi
   - NextAuth konfigurácia
   - Rate limiting setup

2. **Landing Page**
   - Hero section
   - Interaktívna mapa (HeroMap)
   - Features, Stats, CTA sekcie
   - Responsive design

3. **Dashboard**
   - Sidebar navigácia
   - 5 hlavných analytických komponentov
   - Dark theme (FinTech štýl)

4. **API Endpoints**
   - Analytics snapshot
   - Market gaps detection
   - Liquidity tracker
   - Urban development

5. **Pokročilé funkcie**
   - Market Gaps detekcia
   - Liquidity Tracker
   - Scenario Simulator
   - Urban Development tracker
   - Tax Assistant

### 🚧 V procese / Potrebné dokončiť
1. **Database Migrations**
   - Prisma schema je pripravená, ale migrácie ešte neboli spustené
   - Potrebné: `npx prisma migrate dev --name add_advanced_features`

2. **Error Handling**
   - API endpointy majú základný error handling
   - Potrebné: Lepšie fallbacky pre production

3. **Data Integration**
   - Momentálne mock dáta
   - Potrebné: Integrácia s realitnými portálmi (Nehnuteľnosti.sk, Reality.sk)

4. **Testing**
   - Žiadne testy zatiaľ
   - Potrebné: Unit testy, integration testy

### 📋 Plánované (nie implementované)
1. Property Management System (CRUD)
2. Property Comparison Engine
3. Portfolio Management
4. AI Predictions (ML modely)
5. Real-time data scraping
6. Mobile app (React Native)
7. Payment integration (Stripe)

---

## 🎨 Design System

### Farbová paleta
- **Primary:** Emerald (`#10b981`, `#34d399`)
- **Secondary:** Gold (`#fbbf24`, `#f59e0b`)
- **Background:** Slate (`#0f172a`, `#1e293b`, `#334155`)
- **Text:** Slate (`#f1f5f9`, `#cbd5e1`, `#94a3b8`)
- **Accent:** Rose (`#f43f5e`) pre varovania/nízke výnosy

### Typography
- Font: System UI stack (`system-ui, -apple-system, sans-serif`)
- Headings: Bold, large (text-4xl až text-7xl)
- Body: Regular, medium (text-base, text-lg)

### Komponenty štýl
- Rounded corners: `rounded-lg`, `rounded-xl`
- Borders: `border-slate-800`, `border-slate-700`
- Shadows: Custom emerald/gold shadows
- Animations: Tailwind utilities + custom CSS

---

## 🔄 Data Flow

### Market Gaps Flow
1. User otvorí dashboard
2. `MarketGaps.tsx` volá `/api/v1/market-gaps`
3. API aktualizuje `StreetAnalytics`
4. API porovnáva nehnuteľnosti s priemerom
5. Vytvorí `MarketGap` záznamy pre gap ≥ 15%
6. Frontend zobrazí push notification štýl karty

### Liquidity Tracker Flow
1. User otvorí dashboard
2. `LiquidityTracker.tsx` volá `/api/v1/liquidity`
3. API vypočíta `days_on_market` z `first_listed_at`
4. API porovná aktuálnu cenu s `PriceHistory`
5. Frontend zobrazí stopky a zmeny cien

### Scenario Simulator Flow
1. User upraví posuvníky
2. `useMemo` hook prepočíta výsledky
3. Zobrazí sa real-time feedback
4. Všetko client-side, žiadne API volania

---

## 🚀 Deployment

### Environment Variables (potrebné)
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://srei-mqfk.vercel.app
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### Build Process
```bash
npm run build  # Prisma generate + Next.js build
```

### Current Deployment
- **Platform:** Vercel
- **URL:** `srei-mqfk.vercel.app`
- **Status:** Production (s niektorými runtime chybami - databáza možno nie je migrovaná)

---

## 📝 Dôležité poznámky

### Pre AI asistentov (Gemini, atď.)

1. **TypeScript Strict Mode:** Všetky typy musia byť explicitné, `any` je zakázané (okrem špeciálnych prípadov s eslint-disable)

2. **Next.js App Router:** Používame nový App Router, nie Pages Router. Všetky routes sú v `app/` adresári.

3. **Server vs Client Components:**
   - Server Components: Default (`.tsx` bez `"use client"`)
   - Client Components: Musia mať `"use client"` na vrchu
   - Leaflet komponenty MUSIA byť client-side (dynamický import s `ssr: false`)

4. **Prisma:**
   - Schema je v `prisma/schema.prisma`
   - Po zmene schema: `npx prisma migrate dev`
   - PostGIS extension musí byť v PostgreSQL

5. **Authentication:**
   - NextAuth v5 (beta) - iný API ako v4
   - JWT strategy (nie database sessions)
   - Session dostupná cez `auth()` z `@/lib/auth`

6. **Error Handling:**
   - API endpointy majú try-catch
   - Frontend komponenty majú error states
   - Fallback pre nedostupnú databázu

7. **Styling:**
   - Tailwind CSS utility classes
   - Custom CSS len pre Leaflet a animácie
   - Dark theme všade

---

## 🎯 Cieľ projektu

Vytvoriť **#1 realitnú investičnú aplikáciu na slovenskom trhu** s:
- AI-powered insights
- Real-time trhové dáta
- Pokročilé analytické nástroje
- Profesionálny UX (Bloomberg terminál štýl)
- Špecializácia na slovenský trh

**Exit Strategy:** Predaj za 12-24 mesiacov za 2-6M € (5-15x ARR multiple)

---

**Posledná aktualizácia:** 23. január 2026
**Verzia:** 0.1.0 (MVP stage)
**Status:** Aktívny vývoj, production deployment na Vercel
