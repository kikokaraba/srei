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
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // LISTING PAGE - zbierame linky na detaily
    if (!request.url.includes('/detail/')) {
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href*="/detail/"]'))
                .map(a => a.href)
                .filter((v, i, s) => s.indexOf(v) === i);
        });
        log.info('Nájdených ' + links.length + ' detailov');
        for (const link of links) {
            await context.enqueueRequest({ url: link });
        }
        return; 
    }

    log.info('Extrahujem dáta z: ' + request.url);

    // Scroll pre lazy-loading
    await page.evaluate(async () => {
        for (let i = 0; i < 5; i++) {
            window.scrollBy(0, 400);
            await new Promise(r => setTimeout(r, 300));
        }
    });
    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
        const result = {
            title: null,
            price_raw: null,
            area_m2: null,
            rooms: null,
            floor: null,
            condition: null,
            building_material: null,
            description: null,
            images: [],
            location: { full: null, city: null, district: null }
        };

        // =============================================
        // 1. JSON-LD PARSER
        // =============================================
        try {
            const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of ldScripts) {
                const parsed = JSON.parse(script.textContent);
                const items = Array.isArray(parsed) ? parsed : [parsed];
                for (const item of items) {
                    if (item.name) result.title = item.name;
                    if (item.description) result.description = item.description;
                    if (item.floorSize && item.floorSize.value) {
                        result.area_m2 = String(item.floorSize.value);
                    }
                    if (item.image) {
                        const imgs = Array.isArray(item.image) ? item.image : [item.image];
                        result.images = imgs.filter(i => typeof i === 'string');
                    }
                }
            }
        } catch (e) {}

        // =============================================
        // 2. AGRESÍVNY TEXTOVÝ SKENER
        // =============================================
        
        // Titulok
        if (!result.title) {
            const h1 = document.querySelector('h1');
            if (h1) result.title = h1.textContent.trim();
        }

        // Cena
        const priceEl = document.querySelector('[class*="price-value"], [class*="price-main"], .cena');
        if (priceEl) result.price_raw = priceEl.textContent.trim();

        // AGRESÍVNA EXTRAKCIA - hľadá reálne slová, nie CSS triedy
        const getCleanText = (labels) => {
            const elements = Array.from(document.querySelectorAll('span, li, td, dt, div'));
            for (const el of elements) {
                const text = (el.textContent || '').trim();
                // Hľadáme presný label alebo label s dvojbodkou
                const matchesLabel = labels.some(l => 
                    text.toLowerCase() === l.toLowerCase() || 
                    text.toLowerCase().startsWith(l.toLowerCase() + ':') ||
                    text.toLowerCase().includes(l.toLowerCase() + ':')
                );
                
                if (matchesLabel) {
                    // Hodnota je buď za dvojbodkou, alebo v súrodencovi
                    let val = null;
                    
                    // Skúsime súrodenca
                    const sibling = el.nextElementSibling;
                    if (sibling) {
                        val = sibling.textContent.trim();
                    }
                    
                    // Alebo text za dvojbodkou v tom istom elemente
                    if (!val && text.includes(':')) {
                        val = text.split(':').pop().trim();
                    }
                    
                    // Alebo v rodičovi za dvojbodkou
                    if (!val && el.parentElement) {
                        const parentText = el.parentElement.textContent || '';
                        if (parentText.includes(':')) {
                            val = parentText.split(':').pop().trim();
                        }
                    }
                    
                    // Odfiltrujeme nezmysly (ID kódy, príliš dlhé stringy)
                    if (val && val.length < 50 && val.length > 0 && !val.match(/^[a-zA-Z0-9]{20,}$/)) {
                        return val;
                    }
                }
            }
            return null;
        };

        // Čísla extrahujeme osobitne
        const getNumber = (labels) => {
            const text = getCleanText(labels);
            if (!text) return null;
            const match = text.match(/(\\d+[\\d,.]*)/);
            return match ? match[1].replace(/\\s/g, '').replace(',', '.') : null;
        };

        // Ak JSON-LD nemal plochu, hľadáme v texte
        if (!result.area_m2) {
            result.area_m2 = getNumber(['Úžitková plocha', 'Plocha', 'Podlahová plocha', 'Rozloha', 'Výmera']);
        }

        // Izby
        result.rooms = getNumber(['Počet izieb', 'Izby']);

        // Poschodie  
        result.floor = getNumber(['Poschodie', 'Podlažie']);

        // Stav - textová hodnota
        result.condition = getCleanText(['Stav objektu', 'Stav nehnuteľnosti', 'Stav']);

        // Konštrukcia - textová hodnota
        result.building_material = getCleanText(['Konštrukcia objektu', 'Konštrukcia', 'Materiál']);

        // Popis
        if (!result.description) {
            const descEl = document.querySelector('[class*="description"], .popis, #popis');
            if (descEl) result.description = descEl.textContent.trim().substring(0, 2000);
        }

        // Obrázky - ak JSON-LD nemal
        if (result.images.length === 0) {
            // PhotoSwipe
            document.querySelectorAll('a[data-pswp-src]').forEach(a => {
                const src = a.getAttribute('data-pswp-src');
                if (src && !result.images.includes(src)) result.images.push(src);
            });
            
            // Štandardné obrázky
            if (result.images.length === 0) {
                document.querySelectorAll('img[src*="img.nehnutelnosti.sk"]').forEach(img => {
                    const src = img.src;
                    if (src && !src.includes('logo') && !src.includes('icon') && !result.images.includes(src)) {
                        result.images.push(src);
                    }
                });
            }
        }

        // Lokácia
        const locEl = document.querySelector('[class*="location"], .adresa, [class*="address"]');
        if (locEl) {
            result.location.full = locEl.textContent.trim();
            const parts = result.location.full.split(',').map(s => s.trim());
            result.location.city = parts[0] || null;
            result.location.district = parts[1] || null;
        }

        return result;
    });

    log.info('Výsledok: area=' + data.area_m2 + ', rooms=' + data.rooms + ', images=' + data.images.length);

    return { 
        ...data, 
        url: request.url, 
        portal: 'nehnutelnosti',
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
