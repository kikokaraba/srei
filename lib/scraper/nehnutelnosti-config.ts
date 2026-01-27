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
    
    // Čakáme na kompletné načítanie a pridáme extra čas pre JS komponenty
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); 

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

    // VYLEPŠENÝ SCROLL: Simulácia reálneho čítania pre aktiváciu obrázkov
    await page.evaluate(async () => {
        const distance = 400;
        for(let i=0; i<4; i++) {
            window.scrollBy(0, distance);
            await new Promise(r => setTimeout(r, 400));
        }
    });
    
    // Extra čas pre lazy-loaded obrázky
    await page.waitForTimeout(1500);

    const data = await page.evaluate(() => {
        // AGRESÍVNY VYHĽADÁVAČ: Hľadáme text v celom riadku bez ohľadu na triedy
        const getParameter = (searchStrings) => {
            const elements = Array.from(document.querySelectorAll('li, tr, .parameter-row, .table-row, dt, dd, [class*="param"]'));
            for (const el of elements) {
                const text = el.textContent.toLowerCase();
                if (searchStrings.some(s => text.includes(s.toLowerCase()))) {
                    // Vrátime poslednú časť textu v riadku (zvyčajne hodnota)
                    const valueEl = el.querySelector('.value, .parameter-value, td:last-child, dd');
                    if (valueEl) return valueEl.textContent?.trim();
                    // Fallback: vezmeme text za dvojbodkou
                    const parts = el.textContent.split(':');
                    if (parts.length > 1) return parts.pop()?.trim();
                    return null;
                }
            }
            return null;
        };

        // Selektory pre obrázky - hľadáme originály, nie náhľady
        const imgElements = Array.from(document.querySelectorAll('img[src*="img.nehnutelnosti.sk"], img[data-src*="img.nehnutelnosti.sk"]'));
        const photoUrls = imgElements
            .map(img => img.src || img.getAttribute('data-src'))
            .filter(src => src && (src.includes('/full/') || src.includes('/optim/') || src.includes('/large/')))
            .filter((v, i, s) => s.indexOf(v) === i);
        
        // Fallback: ak nemáme full/optim, vezmeme čokoľvek
        if (photoUrls.length === 0) {
            document.querySelectorAll('img[src*="img.nehnutelnosti.sk"]').forEach(img => {
                const src = img.src || img.getAttribute('data-src');
                if (src && !src.includes('logo') && !src.includes('icon')) {
                    photoUrls.push(src);
                }
            });
        }

        // Extrakcia lokácie
        const locationEl = document.querySelector('[class*="location"], .address, [class*="address"]');
        const locationText = locationEl?.textContent?.trim() || '';
        const locationParts = locationText.split(',').map(s => s.trim());

        return {
            title: document.querySelector('h1')?.textContent?.trim(),
            price_raw: document.querySelector('[class*="price-value"], [class*="detail-price"], [class*="price"]')?.textContent?.trim(),
            
            // Hľadáme pomocou viacerých možných názvov
            area_m2: getParameter(['Úžitková plocha', 'Plocha', 'Rozloha', 'Výmera']),
            rooms: getParameter(['Počet izieb', 'Izby', 'Izbový']),
            floor: getParameter(['Poschodie', 'Podlažie', 'Podlaží']),
            building_material: getParameter(['Konštrukcia', 'Materiál', 'Typ budovy']),
            condition: getParameter(['Stav objektu', 'Stav nehnuteľnosti', 'Stav']),
            elevator: getParameter(['Výťah']),
            balcony: getParameter(['Balkón', 'Loggia', 'Terasa']),
            parking: getParameter(['Parkovanie', 'Garáž', 'Parking']),
            heating: getParameter(['Vykurovanie', 'Kúrenie']),
            year_built: getParameter(['Rok výstavby', 'Rok kolaudácie', 'Rok']),
            energy_certificate: getParameter(['Energetická trieda', 'Energetický certifikát']),
            
            description: document.querySelector('[class*="description"], #description, .popis')?.textContent?.trim(),
            images: photoUrls,
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
            }
        };
    });

    log.info('Extrahované: area=' + data.area_m2 + ', images=' + (data.images?.length || 0));

    return { 
        ...data, 
        url: request.url, 
        portal: 'nehnutelnosti',
        success: !!(data.area_m2 || data.price_raw),
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
