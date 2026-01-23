# Oprava React verzií - Návod

## Problém
npm našiel React 18.3.1 v node_modules, hoci v `package.json` máme React 19.2.0. Toto je spôsobené starým `package-lock.json` alebo npm cache.

## Riešenie

### Krok 1: Vymazať staré závislosti
```bash
rm -rf node_modules package-lock.json
```

### Krok 2: Vymazať npm cache (voliteľné, ale odporúčané)
```bash
npm cache clean --force
```

### Krok 3: Reinstalovať závislosti
```bash
npm install
```

### Alternatíva: Použiť --legacy-peer-deps (ak vyššie nefunguje)
```bash
npm install --legacy-peer-deps
```

## Overenie

Po inštalácii skontrolujte verzie:
```bash
npm list react react-dom
```

Mali by ste vidieť:
```
react@19.2.0
react-dom@19.2.0
```

## Poznámky

- **next-auth 5.0.0-beta.25** má známe problémy s React 19, ale technicky by mal fungovať
- **react-leaflet 5.0.0** vyžaduje React 19, takže je to správne
- Ak sa problémy vyskytnú po upgrade, pozrite si `UPGRADE_NOTES.md`
