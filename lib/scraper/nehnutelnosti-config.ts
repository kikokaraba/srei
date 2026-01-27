/**
 * Nehnutelnosti.sk - Hĺbková Page Funkcia pre Apify
 * 
 * Táto funkcia:
 * 1. Najprv zbiera linky na detaily zo stránky s listingom
 * 2. Potom vchádza do každého detailu a extrahuje všetky dáta
 * 3. Sťahuje fotky vo vysokom rozlíšení
 * 4. Extrahuje technické parametre (tehla/panel, výťah, stav)
 */

export const NEHNUTELNOSTI_PAGE_FUNCTION = `
async function pageFunction(context) {
    const { page, request, log } = context;
    
    // Čakáme na kompletné načítanie + extra čas pre JS
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500); 

    if (!request.url.includes('/detail/')) {
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href*="/detail/"]'))
                .map(a => a.href)
                .filter((v, i, s) => s.indexOf(v) === i);
        });
        log.info('Nájdených ' + links.length + ' detailov na stránke');
        for (const link of links) {
            await context.enqueueRequest({ url: link, userData: { label: 'DETAIL' } });
        }
        return; 
    }

    log.info('Hĺbková analýza detailu: ' + request.url);

    // Scroll pre aktiváciu lazy-loaded obsahu
    await page.evaluate(async () => {
        for(let i = 0; i < 5; i++) {
            window.scrollBy(0, 500);
            await new Promise(r => setTimeout(r, 300));
        }
        window.scrollTo(0, 0); // Späť hore
    });
    await page.waitForTimeout(1500);

    const data = await page.evaluate(() => {
        // ============================================================
        // METÓDA 1: JSON-LD PARSER (Najspoľahlivejšie!)
        // ============================================================
        let jsonLdData = null;
        try {
            const ldScript = document.querySelector('script[type="application/ld+json"]');
            if (ldScript) {
                const parsed = JSON.parse(ldScript.textContent);
                // Môže byť pole alebo objekt
                const item = Array.isArray(parsed) ? parsed.find(p => p['@type'] === 'Product' || p['@type'] === 'Offer' || p['@type'] === 'RealEstateListing') : parsed;
                if (item) {
                    jsonLdData = {
                        title: item.name,
                        price: item.offers?.price || item.price,
                        description: item.description,
                        images: item.image ? (Array.isArray(item.image) ? item.image : [item.image]) : [],
                        address: item.address?.streetAddress || item.address,
                        area: item.floorSize?.value,
                    };
                }
            }
        } catch (e) {
            // JSON-LD parsing failed, continue with other methods
        }

        // ============================================================
        // METÓDA 2: WINDOW STATE PARSER
        // ============================================================
        let stateData = null;
        try {
            const scripts = Array.from(document.querySelectorAll('script'));
            for (const script of scripts) {
                const content = script.textContent || '';
                // Hľadáme __INITIAL_STATE__, __NUXT__, __NEXT_DATA__, window.DATA
                const patterns = [
                    /window\.__INITIAL_STATE__\s*=\s*({.+?});/s,
                    /window\.__NUXT__\s*=\s*({.+?});/s,
                    /__NEXT_DATA__.*?({.+})/s,
                ];
                for (const pattern of patterns) {
                    const match = content.match(pattern);
                    if (match) {
                        try {
                            const data = JSON.parse(match[1]);
                            if (data.property || data.listing || data.advert) {
                                stateData = data.property || data.listing || data.advert;
                                break;
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (e) {}

        // ============================================================
        // METÓDA 3: LABEL-BASED EXTRAKCIA (Hľadá presný text)
        // ============================================================
        const getValByLabel = (labels) => {
            const allElements = Array.from(document.querySelectorAll('*'));
            for (const label of labels) {
                for (const el of allElements) {
                    // Hľadáme element s presným textom labelu
                    if (el.childNodes.length === 1 && el.textContent?.trim().toLowerCase() === label.toLowerCase()) {
                        // Skúsime rôzne stratégie nájdenia hodnoty
                        const sibling = el.nextElementSibling;
                        if (sibling) return sibling.textContent?.trim();
                        
                        const parent = el.parentElement;
                        if (parent) {
                            const lastChild = parent.lastElementChild;
                            if (lastChild && lastChild !== el) return lastChild.textContent?.trim();
                        }
                    }
                }
            }
            
            // Fallback: Hľadáme v celom texte elementu
            const rows = Array.from(document.querySelectorAll('tr, li, div, span'));
            for (const label of labels) {
                for (const row of rows) {
                    const text = row.textContent?.toLowerCase() || '';
                    if (text.includes(label.toLowerCase())) {
                        // Extrahuj číslo z textu
                        const numMatch = row.textContent?.match(/(\d+[\s,.]?\d*)\s*(m²|m2)?/);
                        if (numMatch) return numMatch[1].replace(/\s/g, '');
                        
                        // Alebo vezmi text za dvojbodkou
                        const parts = row.textContent?.split(':');
                        if (parts && parts.length > 1) return parts.pop()?.trim();
                    }
                }
            }
            return null;
        };

        // ============================================================
        // METÓDA 4: CSS SELECTOR FALLBACK
        // ============================================================
        const getBySelectors = (selectors) => {
            for (const sel of selectors) {
                try {
                    const el = document.querySelector(sel);
                    if (el?.textContent?.trim()) return el.textContent.trim();
                } catch (e) {}
            }
            return null;
        };

        // ============================================================
        // OBRÁZKY - Multi-stratégia
        // ============================================================
        const photoUrls = [];
        
        // 1. PhotoSwipe galéria
        document.querySelectorAll('a[data-pswp-src]').forEach(a => {
            const src = a.getAttribute('data-pswp-src');
            if (src) photoUrls.push(src);
        });
        
        // 2. Data-src atribúty
        document.querySelectorAll('[data-src*="img.nehnutelnosti.sk"]').forEach(el => {
            const src = el.getAttribute('data-src');
            if (src && !photoUrls.includes(src)) photoUrls.push(src);
        });
        
        // 3. Štandardné img elementy
        document.querySelectorAll('img[src*="img.nehnutelnosti.sk"]').forEach(img => {
            let src = img.src;
            // Upgrade na full quality
            src = src.replace(/_thumb|_small|_medium/g, '_full');
            if (src && !photoUrls.includes(src) && !src.includes('logo') && !src.includes('icon')) {
                photoUrls.push(src);
            }
        });

        // ============================================================
        // FINÁLNA EXTRAKCIA
        // ============================================================
        const title = jsonLdData?.title || 
                     document.querySelector('h1')?.textContent?.trim();
        
        const price_raw = getBySelectors([
            '[class*="price-value"]', '[class*="detail-price"]', 
            '.price-main', '.cena', '[data-testid="price"]'
        ]) || jsonLdData?.price?.toString();

        const area_m2 = jsonLdData?.area ||
                       stateData?.area || stateData?.usableArea ||
                       getValByLabel(['Úžitková plocha', 'Plocha', 'Rozloha', 'Výmera', 'Celková plocha']) ||
                       getBySelectors(['[data-testid="area"]', '[class*="area-value"]']);

        const rooms = getValByLabel(['Počet izieb', 'Izby', 'Izbový', 'Rooms']) ||
                     stateData?.rooms;

        const floor = getValByLabel(['Poschodie', 'Podlažie', 'Podlaží', 'Floor']) ||
                     stateData?.floor;

        const condition = getValByLabel(['Stav objektu', 'Stav nehnuteľnosti', 'Stav']) ||
                         stateData?.condition;

        const building_material = getValByLabel(['Konštrukcia', 'Materiál', 'Typ budovy', 'Druh']) ||
                                 stateData?.buildingType;

        const description = document.querySelector('[class*="description"], #description, .popis, [data-testid="description"]')?.textContent?.trim() ||
                           jsonLdData?.description;

        // Lokácia
        const locationEl = document.querySelector('[class*="location"], .address, [class*="address"], [data-testid="location"]');
        const locationText = locationEl?.textContent?.trim() || jsonLdData?.address || '';
        const locationParts = locationText.split(',').map(s => s.trim());

        return {
            title,
            price_raw,
            area_m2,
            rooms,
            floor,
            building_material,
            condition,
            elevator: getValByLabel(['Výťah', 'Elevator']),
            balcony: getValByLabel(['Balkón', 'Loggia', 'Terasa']),
            parking: getValByLabel(['Parkovanie', 'Garáž', 'Parking']),
            heating: getValByLabel(['Vykurovanie', 'Kúrenie']),
            year_built: getValByLabel(['Rok výstavby', 'Rok kolaudácie']),
            energy_certificate: getValByLabel(['Energetická trieda', 'Energetický certifikát']),
            description,
            images: photoUrls.length > 0 ? photoUrls : (jsonLdData?.images || []),
            location: {
                full: locationText,
                city: locationParts[0] || null,
                district: locationParts[1] || null,
                street: locationParts[2] || null
            },
            seller: {
                name: document.querySelector('[class*="contact-name"], [class*="agent"], [class*="seller"]')?.textContent?.trim(),
                phone: document.querySelector('a[href^="tel:"]')?.href?.replace('tel:', ''),
                agency: document.querySelector('[class*="agency"], [class*="realitka"]')?.textContent?.trim()
            },
            _debug: {
                jsonLdFound: !!jsonLdData,
                stateDataFound: !!stateData,
                photosCount: photoUrls.length
            }
        };
    });

    log.info('Extrahované: area=' + data.area_m2 + ', rooms=' + data.rooms + ', images=' + (data.images?.length || 0) + ', debug=' + JSON.stringify(data._debug));

    return { 
        ...data, 
        url: request.url, 
        portal: 'nehnutelnosti',
        success: !!(data.area_m2 || data.price_raw || data.images?.length > 0),
        scraped_at: new Date().toISOString()
    };
}
`;

/**
 * Bazoš.sk Page Funkcia
 */
export const BAZOS_PAGE_FUNCTION = `
async function pageFunction(context) {
    const { page, request, log } = context;
    await page.waitForLoadState('domcontentloaded');
    
    // Listing page
    if (!request.url.includes('/inzerat/')) {
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href*="/inzerat/"]'))
                .map(a => a.href)
                .filter((v, i, s) => s.indexOf(v) === i);
        });
        
        for (const link of links) {
            await context.enqueueRequest({ url: link, userData: { label: 'DETAIL' } });
        }
        return;
    }

    log.info('Analyzujem Bazoš detail: ' + request.url);

    const data = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('.obrazky img, .gallery img, .foto img'))
            .map(img => img.src)
            .filter(src => src && !src.includes('placeholder'));

        return {
            title: document.querySelector('h1, .nadpis')?.textContent?.trim(),
            price_raw: document.querySelector('.cena, .inzeratcena')?.textContent?.trim(),
            description: document.querySelector('.popis, .text')?.textContent?.trim(),
            location: document.querySelector('.lokalita')?.textContent?.trim(),
            images,
            seller: {
                name: document.querySelector('.kontakt, .predajca')?.textContent?.trim(),
                phone: document.querySelector('a[href^="tel:"]')?.href?.replace('tel:', ''),
            },
            posted_at: document.querySelector('.datum, [class*="date"]')?.textContent?.trim(),
        };
    });

    return { 
        ...data, 
        url: request.url, 
        portal: 'bazos',
        scraped_at: new Date().toISOString()
    };
}
`;

/**
 * Reality.sk Page Funkcia
 */
export const REALITY_PAGE_FUNCTION = `
async function pageFunction(context) {
    const { page, request, log } = context;
    await page.waitForLoadState('networkidle');
    
    if (!request.url.includes('/detail/') && !request.url.includes('/inzerat/')) {
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href*="/detail/"], a[href*="/inzerat/"]'))
                .map(a => a.href)
                .filter((v, i, s) => s.indexOf(v) === i);
        });
        
        for (const link of links) {
            await context.enqueueRequest({ url: link, userData: { label: 'DETAIL' } });
        }
        return;
    }

    const data = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('.gallery img, .photo img'))
            .map(img => img.getAttribute('data-src') || img.src)
            .filter(src => src && !src.includes('placeholder'));

        return {
            title: document.querySelector('h1')?.textContent?.trim(),
            price_raw: document.querySelector('.price, [class*="cena"]')?.textContent?.trim(),
            area_m2: document.querySelector('[class*="area"]')?.textContent?.trim(),
            description: document.querySelector('.description, [class*="popis"]')?.textContent?.trim(),
            location: document.querySelector('.location, [class*="lokac"]')?.textContent?.trim(),
            images,
        };
    });

    return { 
        ...data, 
        url: request.url, 
        portal: 'reality',
        scraped_at: new Date().toISOString()
    };
}
`;
