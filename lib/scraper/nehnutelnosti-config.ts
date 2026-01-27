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
    
    // Ak nie sme na detaile, zbierame linky
    if (!request.url.includes('/detail/')) {
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href*="/detail/"]'))
                .map(a => a.href)
                .filter((v, i, s) => s.indexOf(v) === i);
        });
        
        log.info('Nájdených ' + links.length + ' detailov na stránke');
        
        for (const link of links) {
            await context.enqueueRequest({ 
                url: link, 
                userData: { label: 'DETAIL' } 
            });
        }
        return; 
    }

    log.info('Analyzujem detail: ' + request.url);
    
    // Auto-scroll pre lazy-loading obrázkov
    await page.evaluate(async () => {
        window.scrollBy(0, 800);
        await new Promise(r => setTimeout(r, 500));
        window.scrollBy(0, 800);
        await new Promise(r => setTimeout(r, 500));
        window.scrollBy(0, 800);
    });

    const data = await page.evaluate(() => {
        // Helper funkcia na extrakciu parametrov
        const getVal = (label) => {
            const row = Array.from(document.querySelectorAll('.table-row, .parameter-row, tr, .param-row'))
                .find(el => el.textContent.toLowerCase().includes(label.toLowerCase()));
            return row ? (row.querySelector('.value, .parameter-value, td:last-child')?.textContent?.trim() || null) : null;
        };

        // Extrakcia fotiek vo vysokom rozlíšení
        const photoUrls = Array.from(document.querySelectorAll('a[data-photoswipe-index], .gallery a, .photo-gallery a'))
            .map(a => a.getAttribute('href') || a.getAttribute('data-src'))
            .filter(src => src && (src.includes('img.nehnutelnosti.sk') || src.includes('cdn')));
        
        // Fallback na img elementy
        if (photoUrls.length === 0) {
            document.querySelectorAll('.gallery img, .photo-gallery img, .estate-detail img').forEach(img => {
                const src = img.getAttribute('data-src') || img.getAttribute('src');
                if (src && !src.includes('placeholder') && !src.includes('logo')) {
                    photoUrls.push(src.replace(/_thumb|_small|_medium/g, ''));
                }
            });
        }

        // Extrakcia lokácie
        const locationEl = document.querySelector('.location, .estate-detail__location, [class*="location"]');
        const locationParts = locationEl?.textContent?.trim().split(',').map(s => s.trim()) || [];

        return {
            title: document.querySelector('h1')?.textContent?.trim(),
            price_raw: document.querySelector('.price-value, .component-advertisement-detail-price, .estate-detail__price, .price-main')?.textContent?.trim(),
            area_m2: getVal('Úžitková plocha') || getVal('Zastavaná plocha') || getVal('Plocha'),
            rooms: getVal('Počet izieb') || getVal('Izby'),
            floor: getVal('Poschodie') || getVal('Podlažie'),
            total_floors: getVal('Počet podlaží') || getVal('Poschodí'),
            building_material: getVal('Konštrukcia objektu') || getVal('Konštrukcia') || getVal('Materiál'),
            condition: getVal('Stav objektu') || getVal('Stav'),
            elevator: getVal('Výťah'),
            balcony: !!(getVal('Balkón') || getVal('Loggia') || getVal('Terasa')),
            parking: getVal('Parkovanie') || getVal('Garáž'),
            heating: getVal('Vykurovanie') || getVal('Kúrenie'),
            year_built: getVal('Rok výstavby') || getVal('Rok kolaudácie'),
            energy_certificate: getVal('Energetická trieda') || getVal('Energetický certifikát'),
            description: document.querySelector('.component-advertisement-detail-description, .description, .estate-detail__description')?.textContent?.trim(),
            images: photoUrls,
            location: {
                full: locationEl?.textContent?.trim(),
                city: locationParts[0] || null,
                district: locationParts[1] || null,
                street: locationParts[2] || null,
            },
            seller: {
                name: document.querySelector('.contact-name, .agent-name, [class*="seller"]')?.textContent?.trim(),
                phone: document.querySelector('a[href^="tel:"]')?.href?.replace('tel:', ''),
                agency: document.querySelector('.agency-name, .realitna-kancelaria')?.textContent?.trim(),
            }
        };
    });

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
