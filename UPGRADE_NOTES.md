# Upgrade Notes - Major Version Updates

Tento dokument obsahuje dôležité poznámky k major version updates, ktoré boli vykonané.

## ⚠️ Breaking Changes - Vyžadujú pozornosť

### 1. **Next.js 15.1.6 → 16.1.4**
- **Breaking Changes:** 
  - Nové API pre Server Components
  - Zmeny v routing a middleware
  - Turbopack je teraz stabilný
- **Akcia:** Skontrolovať Next.js 16 migration guide: https://nextjs.org/docs/app/getting-started/upgrading

### 2. **React 18.3.1 → 19.2.0**
- **Breaking Changes:**
  - Nové hooks: `useActionState`, `useOptimistic`
  - Zmeny v Server Components
  - Ref callback môže byť funkcia
- **Akcia:** Skontrolovať React 19 migration guide: https://react.dev/blog/2024/12/05/react-19

### 3. **Tailwind CSS 3.4.17 → 4.1.18** ⚠️ VEĽKÉ ZMENY
- **Breaking Changes:**
  - **Nová konfigurácia:** Tailwind 4 používa CSS-first konfiguráciu
  - `tailwind.config.ts` sa môže zmeniť na `@config` v CSS
  - Zmeny v plugin API
  - Nový engine pre kompiláciu
- **Akcia:** 
  1. Skontrolovať Tailwind 4 migration guide: https://tailwindcss.com/docs/upgrade-guide
  2. Možno bude potrebné upraviť `tailwind.config.ts`
  3. Skontrolovať `app/globals.css` - možno bude potrebné pridať `@import "tailwindcss";`

### 4. **Zod 3.24.1 → 4.3.5**
- **Breaking Changes:**
  - Zmeny v error handling
  - Nové API pre refinements
  - Zmeny v type inference
- **Akcia:** Skontrolovať Zod 4 migration guide: https://zod.dev/?id=migration-guide

### 5. **react-leaflet 4.2.1 → 5.0.0**
- **Breaking Changes:**
  - **Vyžaduje React 19** ✅ (už máme)
  - Odstránený `LeafletProvider` z core
  - Zmeny v event handling
- **Akcia:** Skontrolovať react-leaflet 5 migration guide: https://react-leaflet.js.org/

## ✅ Minor/Patch Updates (bez breaking changes)

- `@tanstack/react-query`: 5.62.11 → 5.90.16
- `TypeScript`: 5.7.2 → 5.9.3
- `lucide-react`: 0.468.0 → 0.562.0
- `zustand`: 5.0.2 → 5.0.10

## 📋 Postup inštalácie

```bash
# 1. Inštalácia nových závislostí
npm install

# 2. Regenerovanie Prisma clientu
npx prisma generate

# 3. Testovanie build
npm run build

# 4. Testovanie dev servera
npm run dev
```

## 🔍 Kontrola po upgrade

1. **Tailwind CSS:** Skontrolovať, či sa všetky štýly správne renderujú
2. **Zod validácie:** Skontrolovať, či všetky validácie fungujú správne
3. **React komponenty:** Skontrolovať, či sa všetky komponenty správne renderujú
4. **react-leaflet:** Skontrolovať, či mapa funguje správne
5. **Next.js:** Skontrolovať routing a Server Components

## 🐛 Známe problémy

- **Tailwind 4:** Môže byť potrebné upraviť konfiguráciu
- **React 19:** Niektoré staršie knižnice môžu mať problémy
- **Next.js 16:** Middleware môže vyžadovať úpravy

## 📚 Užitočné odkazy

- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/getting-started/upgrading)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/12/05/react-19)
- [Tailwind CSS 4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Zod 4 Migration Guide](https://zod.dev/?id=migration-guide)
- [react-leaflet 5 Migration Guide](https://react-leaflet.js.org/)

---

**Dátum aktualizácie:** 23. január 2026
