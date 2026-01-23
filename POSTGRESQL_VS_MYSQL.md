# Prečo PostgreSQL namiesto MySQL pre SRIA?

## 🎯 Hlavné dôvody

### 1. **PostGIS Extension - Geospatial Queries** ⭐ **KĽÚČOVÉ**

SRIA aplikácia pracuje s **geografickými dátami** (lokácie nehnuteľností, mapy Slovenska, vzdialenosti):

```prisma
// V našom schema:
coordinates Unsupported("geometry(Point,4326)")? // PostGIS Point
```

**PostgreSQL + PostGIS:**
- ✅ Natívna podpora pre geospatial queries
- ✅ `ST_Distance`, `ST_Within`, `ST_Contains` funkcie
- ✅ Indexovanie geografických dát (GIST indexy)
- ✅ Vysoká výkonnosť pre mapové aplikácie
- ✅ Podpora pre GeoJSON, WKT, WKB formáty

**MySQL:**
- ❌ Obmedzená geospatial podpora (len základné typy)
- ❌ Chýbajú pokročilé geospatial funkcie
- ❌ Slabšia výkonnosť pre komplexné geografické queries
- ❌ Nie je ekvivalent PostGIS extension

**Príklad použitia v SRIA:**
```typescript
// Nájsť nehnuteľnosti v okruhu 500m od urbanistického projektu
prisma.$queryRaw`
  SELECT * FROM "Property" 
  WHERE ST_DWithin(
    coordinates, 
    ST_MakePoint(${lng}, ${lat})::geography,
    500
  )
`
```

### 2. **JSON a JSONB Support**

**PostgreSQL:**
- ✅ Natívny `JSONB` typ s indexovaním
- ✅ Rýchle JSON queries
- ✅ GIN indexy pre JSONB
- ✅ Pokročilé JSON operátory (`@>`, `?`, `?&`, `?|`)

**MySQL:**
- ⚠️ Základná JSON podpora (od MySQL 5.7)
- ❌ Slabšia výkonnosť
- ❌ Obmedzené indexovanie

**Pre SRIA:** Užitočné pre flexibilné ukladanie property metadata, market analytics, atď.

### 3. **Array Types**

**PostgreSQL:**
- ✅ Natívne array typy (`text[]`, `integer[]`)
- ✅ Array operátory a funkcie
- ✅ Indexovanie polí

**MySQL:**
- ❌ Žiadna natívna podpora pre arrays
- ⚠️ Musíte používať JSON alebo normalizovať do samostatných tabuliek

**Pre SRIA:** Užitočné pre tags, features nehnuteľností, atď.

### 4. **Full-Text Search**

**PostgreSQL:**
- ✅ Pokročilý full-text search s `tsvector` a `tsquery`
- ✅ Ranking výsledkov
- ✅ Multi-language support
- ✅ GIN indexy pre rýchle vyhľadávanie

**MySQL:**
- ⚠️ Základný full-text search
- ❌ Slabšia funkcionalita

**Pre SRIA:** Dôležité pre vyhľadávanie nehnuteľností podľa popisu, adresy, atď.

### 5. **Advanced Data Types**

**PostgreSQL:**
- ✅ `UUID` (natívny typ)
- ✅ `HSTORE` (key-value store)
- ✅ `RANGE` typy (date ranges, number ranges)
- ✅ `ENUM` typy
- ✅ Custom types

**MySQL:**
- ⚠️ Obmedzená podpora pre pokročilé typy

### 6. **Transaction Support a ACID**

**PostgreSQL:**
- ✅ Plná ACID compliance
- ✅ MVCC (Multi-Version Concurrency Control)
- ✅ Pokročilé transaction isolation levels
- ✅ Savepoints v transakciách

**MySQL:**
- ✅ ACID compliance (InnoDB)
- ⚠️ Slabšia MVCC implementácia
- ⚠️ Obmedzené isolation levels

### 7. **Prisma ORM Kompatibilita**

**PostgreSQL:**
- ✅ Plná podpora všetkých Prisma features
- ✅ PostGIS extension podpora (cez `Unsupported` typ)
- ✅ Všetky Prisma query funkcie fungujú

**MySQL:**
- ✅ Základná Prisma podpora
- ❌ Chýbajú niektoré pokročilé features
- ❌ Žiadna PostGIS ekvivalentná podpora

### 8. **Enterprise Features**

**PostgreSQL:**
- ✅ Materialized views
- ✅ Common Table Expressions (CTE)
- ✅ Window functions
- ✅ Recursive queries
- ✅ Foreign Data Wrappers (FDW)
- ✅ Extensions ecosystem

**MySQL:**
- ⚠️ Obmedzená podpora pre pokročilé features

### 9. **Performance pre Analytics**

**PostgreSQL:**
- ✅ Vynikajúca výkonnosť pre komplexné analytické queries
- ✅ Query planner optimalizácie
- ✅ Parallel query execution
- ✅ Partitioning support

**MySQL:**
- ⚠️ Slabšia výkonnosť pre komplexné analytické queries

**Pre SRIA:** Dôležité pre market analytics, ROI calculations, atď.

### 10. **Open Source a Community**

**PostgreSQL:**
- ✅ 100% open source (PostgreSQL License)
- ✅ Veľká komunita
- ✅ Aktívny vývoj
- ✅ Bez licenčných poplatkov

**MySQL:**
- ⚠️ Oracle vlastní MySQL (GPL licencia)
- ⚠️ Oracle MySQL vs MariaDB rozdelenie komunity

## 📊 Porovnanie pre SRIA Use Case

| Feature | PostgreSQL | MySQL | Dôležitosť pre SRIA |
|---------|-----------|-------|---------------------|
| **PostGIS (Geospatial)** | ✅✅✅ | ❌ | **KRITICKÉ** - mapy, lokácie |
| **JSON/JSONB** | ✅✅ | ⚠️ | Vysoká - flexibilné dáta |
| **Arrays** | ✅✅ | ❌ | Stredná - tags, features |
| **Full-Text Search** | ✅✅ | ⚠️ | Vysoká - vyhľadávanie |
| **Prisma Support** | ✅✅ | ✅ | Vysoká - ORM kompatibilita |
| **Analytics Performance** | ✅✅ | ⚠️ | Vysoká - market analytics |
| **Enterprise Features** | ✅✅ | ⚠️ | Stredná - budúci rast |

## 🎯 Záver

**PostgreSQL je lepšia voľba pre SRIA, pretože:**

1. **PostGIS je kritické** - bez neho nemôžeme robiť geospatial queries pre mapy a lokácie nehnuteľností
2. **Pokročilé features** - JSONB, arrays, full-text search sú užitočné pre realitnú aplikáciu
3. **Výkonnosť** - lepšia pre analytické queries (market analytics, ROI calculations)
4. **Prisma kompatibilita** - plná podpora všetkých features
5. **Enterprise-ready** - vhodné pre rastúcu aplikáciu

**MySQL by bol vhodný, ak:**
- Nepotrebujete geospatial queries
- Máte jednoduchšiu databázovú štruktúru
- Používate MySQL-specific features

## 🔄 Migrácia na MySQL (ak by bola potrebná)

Ak by ste chceli migrovať na MySQL:

1. **Odstrániť PostGIS závislosti:**
   - Odstrániť `geometry(Point,4326)` typy
   - Nahradiť geospatial queries iným riešením (napr. aplikácia-side calculations)

2. **Upraviť Prisma schema:**
   ```prisma
   datasource db {
     provider = "mysql"  // namiesto "postgresql"
   }
   ```

3. **Upraviť queries:**
   - Nahradiť PostGIS funkcie
   - Upraviť JSON queries na MySQL syntax

4. **Zmeniť Prisma adapter:**
   - Použiť `@prisma/adapter-mysql` namiesto `@prisma/adapter-pg`

**Odporúčanie:** Zostať pri PostgreSQL kvôli PostGIS a pokročilým features.

---

**Poznámka:** Obe databázy sú výkonné a vhodné pre production, ale pre SRIA je PostgreSQL lepšia voľba kvôli geospatial requirements.
