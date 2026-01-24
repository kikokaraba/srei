# SRIA - Slovenská Realitná Investičná Aplikácia

## 📋 Prehľad projektu

**SRIA** je prémiová investičná platforma pre nehnuteľnosti na Slovensku, navrhnutá pre serióznych investorov, ktorí potrebujú pokročilé analytické nástroje a AI-powered insights pre optimálne investičné rozhodnutia.

---

## ✅ ČO JE HOTOVÉ

### 🎨 **Landing Page (Hlavná stránka)**
- ✅ **Moderný, nadčasový dizajn** s dark theme
- ✅ **Hero sekcia** s hlavným CTA
- ✅ **Interaktívna mapa Slovenska** (HeroMap)
  - Leaflet s CartoDB Dark Matter tiles
  - GeoJSON hranice krajov
  - Choropleth mapovanie podľa výnosu
  - Custom DivIcon markery pre mestá
  - Hover efekty a dark popupy
- ✅ **Štatistiky** s animovanými číslami (AnimatedCounter)
- ✅ **Features sekcia** s ikonami a popismi
- ✅ **Testimonials** (odporúčania používateľov)
- ✅ **Pricing** (3 tiery: Free, Premium €29/mes, Enterprise €99/mes)
- ✅ **Live Data Indicator** (floating widget s live updates)
- ✅ **CTA sekcia** s trust badges
- ✅ **Navbar** s navigáciou a prihlásením

### 🔐 **Autentifikácia**
- ✅ NextAuth v5 (Auth.js) s JWT strategy
- ✅ Credentials provider
- ✅ Automatické vytvorenie demo účtu (`demo@sria.sk`)
- ✅ Session management
- ✅ Protected routes (middleware)
- ✅ Sign in / Error pages

### 👤 **Onboarding Flow**
- ✅ 5-krokový onboarding proces
- ✅ Možnosť preskočiť onboarding
- ✅ Nastavenie preferencií:
  - Hlavné mesto záujmu
  - Typ investície (future-potential, high-yield, stable-growth, flip, rental)
  - Základné kritériá (výnos, cena, počet izieb)
  - Pokročilé kritériá (cena za m², plocha, market gap, urban impact)
  - Notifikácie
- ✅ OnboardingGuard (presmerovanie ak nie je dokončený)

### 🎛️ **Customizable Dashboard**
- ✅ Drag-and-drop widget systém (@dnd-kit)
- ✅ Ukladanie layoutu do databázy
- ✅ Zobrazenie/skrytie widgetov
- ✅ Persistencia preferencií
- ✅ Widget registry systém

### 📊 **Dashboard Widgety**

#### 1. **Market Overview**
- ✅ Prehľad trhu s kľúčovými metrikami
- ✅ Štatistiky podľa miest

#### 2. **Analytics Cards**
- ✅ Karty s kľúčovými metrikami
- ✅ Vizualizácia dát

#### 3. **Recent Properties**
- ✅ Zoznam nedávnych nehnuteľností
- ✅ Základné informácie

#### 4. **Market Gaps (Index Skrytého Potenciálu)** ⭐
- ✅ Detekcia podhodnotených nehnuteľností
- ✅ Porovnanie s priemernými cenami v uliciach
- ✅ Výpočet gap percentage
- ✅ Odhad potenciálneho zisku
- ✅ Street Analytics (priemerné ceny v uliciach)
- ✅ API endpoint: `/api/v1/market-gaps`

#### 5. **Liquidity Tracker (Čas na Trhu)** ⭐
- ✅ Sledovanie zmien cien nehnuteľností
- ✅ Price History tracking
- ✅ Detekcia poklesov cien
- ✅ Dni v ponuke
- ✅ API endpoint: `/api/v1/liquidity`

#### 6. **Scenario Simulator (Simulátor Scenárov)** ⭐
- ✅ What-if analýza
- ✅ Výpočet ROI, cash-on-cash, yield
- ✅ Rôzne scenáre (kúpa, renovácia, predaj)
- ✅ Finančné projekcie

#### 7. **Urban Development (Urbanistický Rozvoj)** ⭐
- ✅ Sledovanie plánovanej infraštruktúry
- ✅ Vplyv na ceny nehnuteľností
- ✅ Vzdialenosť od infraštruktúry
- ✅ Odhad zhodnotenia
- ✅ API endpoint: `/api/v1/urban-development`

#### 8. **Tax Assistant (Daňový a Právny Asistent)** ⭐
- ✅ Výpočet dane z príjmu
- ✅ 5-ročný test
- ✅ Daňové oslobodenie
- ✅ Odpisové skupiny pre s.r.o.
- ✅ Rôzne typy vlastníctva (fyzická osoba, s.r.o., spoločnosť)

### 🔍 **Advanced Filters**
- ✅ Komplexné filtrovanie nehnuteľností
- ✅ Filtre podľa:
  - Lokalita (mesto, okres, ulica)
  - Cena (min/max, cena za m²)
  - Plocha (min/max)
  - Počet izieb
  - Stav (pôvodný, rekonštrukcia, novostavba)
  - Energetický certifikát
  - Výnos (gross/net yield, cash-on-cash)
  - Market gap
  - Urban impact
  - Nehnuteľnosti v núdzi
- ✅ Ukladanie filtrov do UserPreferences
- ✅ API endpoint: `/api/v1/properties/filtered`

### ⚙️ **Settings Page**
- ✅ Správa preferencií
- ✅ Upravovanie filtrov
- ✅ Notifikačné nastavenia
- ✅ Dashboard preferences

### 🗄️ **Databázové Modely (Prisma)**
- ✅ **User** - používatelia s rolami (ADMIN, PREMIUM_INVESTOR, FREE_USER)
- ✅ **Property** - nehnuteľnosti s kompletnými údajmi
- ✅ **InvestmentMetrics** - investičné metriky (yield, cash-on-cash)
- ✅ **PriceHistory** - história cien
- ✅ **StreetAnalytics** - analýza cien v uliciach
- ✅ **MarketGap** - detekované podhodnotené nehnuteľnosti
- ✅ **UrbanDevelopment** - plánovaná infraštruktúra
- ✅ **PropertyImpact** - vplyv infraštruktúry na nehnuteľnosti
- ✅ **TaxInfo** - daňové informácie
- ✅ **MarketAnalytics** - trhové analýzy
- ✅ **UserPreferences** - používateľské preferencie (50+ polí)
- ✅ **DashboardLayout** - layout dashboardu
- ✅ **Account, Session, VerificationToken** - NextAuth modely

### 🔌 **API Endpoints**
- ✅ `GET/POST /api/v1/user/preferences` - používateľské preferencie
- ✅ `GET/POST /api/v1/dashboard/layout` - layout dashboardu
- ✅ `GET /api/v1/market-gaps` - market gaps analýza
- ✅ `GET /api/v1/liquidity` - liquidity tracker
- ✅ `GET /api/v1/urban-development` - urban development
- ✅ `GET /api/v1/analytics/snapshot` - analytics snapshot
- ✅ `GET /api/v1/properties/filtered` - filtrované nehnuteľnosti

### 🛠️ **Technológie a Infraštruktúra**
- ✅ **Next.js 16** (App Router)
- ✅ **React 19**
- ✅ **TypeScript**
- ✅ **Prisma 7** s PostgreSQL
- ✅ **PostGIS** pre geospatial queries
- ✅ **NextAuth v5** (Auth.js)
- ✅ **Tailwind CSS 4**
- ✅ **TanStack Query** (React Query)
- ✅ **Leaflet + React-Leaflet** pre mapy
- ✅ **@dnd-kit** pre drag-and-drop
- ✅ **Zod** pre validáciu
- ✅ **Upstash Redis** pre rate limiting
- ✅ **Railway** pre databázu

### 🔒 **Bezpečnosť**
- ✅ Content Security Policy (CSP)
- ✅ Security headers (HSTS, X-Frame-Options, atď.)
- ✅ Rate limiting (Upstash)
- ✅ Protected API routes
- ✅ Middleware pre autentifikáciu
- ✅ Zero Trust architektúra

### 📱 **Responsive Design**
- ✅ Mobile-first prístup
- ✅ Responzívny layout
- ✅ Touch-friendly interakcie

---

## 🚧 ČO SA CHYSTÁ / TODO

### 🔄 **Krátkodobé (MVP)**
- [ ] **Plne funkčná autentifikácia s heslom**
  - Hashovanie hesiel (bcrypt)
  - Reset hesla
  - Email verifikácia
- [ ] **Skutočné dáta nehnuteľností**
  - Web scraping / API integrácia
  - Automatické načítavanie nehnuteľností
  - Aktualizácia cien
- [ ] **Notifikácie**
  - Email notifikácie
  - In-app notifikácie
  - Push notifikácie (voliteľne)
- [ ] **Export dát**
  - PDF reporty
  - Excel export
  - CSV export
- [ ] **API dokumentácia**
  - OpenAPI/Swagger
  - API keys pre externých používateľov

### 🎯 **Strednodobé**
- [ ] **AI Predikcie**
  - ML modely pre predikciu cien
  - Trend analýza
  - Odporúčania
- [ ] **Porovnávanie nehnuteľností**
  - Side-by-side comparison
  - Bulk comparison
- [ ] **Heatmap stránka**
  - Interaktívna mapa s nehnuteľnosťami
  - Filtrovanie na mape
  - Clustering
- [ ] **Analytics stránka**
  - Pokročilé grafy
  - Trend analýzy
  - Benchmarking
- [ ] **Comparison stránka**
  - Porovnanie miest
  - Porovnanie období
  - Market reports
- [ ] **Properties stránka**
  - Detailný zoznam
  - Pokročilé filtrovanie
  - Bulk operácie
- [ ] **Platobná integrácia**
  - Stripe / PayPal
  - Subscription management
  - Invoice generovanie
- [ ] **Admin panel**
  - Správa používateľov
  - Správa nehnuteľností
  - Analytics dashboard

### 🚀 **Dlhodobé**
- [ ] **Mobile aplikácia**
  - React Native / Expo
  - Push notifikácie
  - Offline mode
- [ ] **White-label riešenie**
  - Custom branding
  - Multi-tenant architektúra
- [ ] **API pre partnerov**
  - RESTful API
  - GraphQL API
  - Webhooks
- [ ] **Advanced AI Features**
  - Chatbot asistent
  - Voice commands
  - Image recognition (fotky nehnuteľností)
- [ ] **Social Features**
  - Komentáre k nehnuteľnostiam
  - Zdieľanie
  - Investičné skupiny
- [ ] **Internationalizácia**
  - Viacjazyčnosť (EN, SK, CZ)
  - Lokalizácia dát

---

## 📊 **Štatistiky Projektu**

### **Komponenty**
- **Landing:** 9 komponentov
- **Dashboard:** 13 widgetov/komponentov
- **Onboarding:** 1 flow komponent
- **API Routes:** 7 endpointov

### **Databázové Modely**
- **15 modelov** v Prisma schema
- **50+ polí** v UserPreferences
- **PostGIS** pre geospatial queries

### **Technológie**
- **17 dependencies**
- **13 devDependencies**
- **TypeScript** strict mode
- **ESLint** konfigurácia

---

## 🎯 **Cieľová Skupina**

1. **Premium Investor** (€29/mes)
   - Seriózni investori
   - Potrebujú pokročilé nástroje
   - AI predikcie a analýzy

2. **Enterprise** (€99/mes)
   - Realitné kancelárie
   - Investičné fondy
   - White-label riešenie

3. **Free Tier**
   - Začínajúci investori
   - Obmedzené funkcie
   - 10 nehnuteľností/mesiac

---

## 🔑 **Kľúčové Features (5 Premium Features)**

1. ⭐ **Index Skrytého Potenciálu (Market Gaps)**
   - Detekcia podhodnotených nehnuteľností
   - Porovnanie s trhovými cenami
   - Odhad potenciálneho zisku

2. ⭐ **Čas na Trhu (Liquidity Tracker)**
   - Sledovanie zmien cien
   - Detekcia poklesov
   - Optimal timing pre nákup

3. ⭐ **Simulátor Scenárov**
   - What-if analýza
   - Finančné projekcie
   - ROI kalkulácie

4. ⭐ **Urbanistický Rozvoj**
   - Plánovaná infraštruktúra
   - Vplyv na ceny
   - Budúci potenciál

5. ⭐ **Daňový a Právny Asistent**
   - Výpočet dane
   - 5-ročný test
   - Optimalizácia dane

---

## 📝 **Poznámky**

- **Demo účet:** `demo@sria.sk` / akékoľvek heslo (min. 8 znakov)
- **Automatické vytvorenie:** Demo účet sa vytvorí automaticky pri prvom prihlásení
- **Seed script:** `npm run db:seed` (vytvorí demo účet manuálne)
- **Development:** `npm run dev`
- **Build:** `npm run build`
- **Database:** Railway PostgreSQL s PostGIS

---

## 🎨 **Design System**

- **Theme:** Dark (slate-950, emerald accents)
- **Colors:** 
  - Primary: Emerald (500, 600)
  - Background: Slate (950, 900, 800)
  - Accent: Gold/Rose pre highlights
- **Typography:** System fonts
- **Icons:** Lucide React
- **Animations:** Tailwind + custom keyframes

---

*Posledná aktualizácia: 2026-01-24*
