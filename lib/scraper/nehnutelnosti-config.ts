/**
 * Apify Page funkcie – Bazoš.sk a Reality.sk
 */

// (Nehnutelnosti.sk odstránené – zdroj už nie je podporovaný)

/**
 * Bazoš.sk Page Funkcia
 * Extrahuje cenu a lokalitu z tabuľky (riadky Cena:, Lokalita:), plochu/izby/poschodie/stav z titulku a popisu.
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
        // Obrázky – viacero možných kontajnerov
        const images = Array.from(document.querySelectorAll('.obrazky img, .gallery img, .foto img, [class*="inzerat"] img, main img'))
            .map(img => img.src || img.getAttribute('data-src'))
            .filter(src => src && !src.includes('placeholder'));
        
        const descEl = document.querySelector('.popis, .text, [class*="popis"]');
        const desc = descEl ? descEl.textContent.trim() : '';
        
        // Tabuľka: riadky s Cena, Lokalita, Meno atď.
        let price_raw = '';
        let locationText = '';
        let sellerName = '';
        document.querySelectorAll('table tr').forEach(function(tr) {
            const tds = tr.querySelectorAll('td');
            if (tds.length >= 2) {
                const label = (tds[0].textContent || '').trim().toLowerCase();
                const value = (tds[1].textContent || '').trim();
                if (label.indexOf('cena') !== -1) price_raw = value;
                if (label.indexOf('lokalita') !== -1) {
                    const link = tds[1].querySelector('a');
                    locationText = link ? (link.textContent || value).trim() : value;
                }
                if (label.indexOf('meno') !== -1) sellerName = value;
            }
        });
        
        // Fallback: ak tabuľka nenašla cenu, skús známe triedy
        if (!price_raw) {
            const cenaEl = document.querySelector('.cena, .inzeratcena, [class*="cena"]');
            price_raw = cenaEl ? cenaEl.textContent.trim() : '';
        }
        if (!locationText) {
            const locEl = document.querySelector('.lokalita, [class*="lokalita"]');
            locationText = locEl ? locEl.textContent.trim() : '';
        }
        
        const title = (document.querySelector('h1, .nadpis')?.textContent || '').trim();
        const raw_address_context = [locationText, desc ? desc.substring(0, 200) : null].filter(Boolean).join('\\n\\n') || null;

        // Parsovanie plochy, izieb, poschodia a stavu z titulku + popisu (regex)
        const fullText = (title + ' ' + desc).replace(/\\s+/g, ' ');
        let area_m2 = '';
        let rooms = '';
        let floor = '';
        let condition = '';
        
        var areaMatch = fullText.match(/(\\d{2,3})[,.]?(\\d{0,2})?\\s*(m2|m²|štvorc|metr|m\\s*2)/i);
        if (areaMatch) area_m2 = areaMatch[1] + (areaMatch[2] ? '.' + areaMatch[2] : '');
        
        var roomsMatch = fullText.match(/(\\d)[+\\-]?\\s*(izbov[ýá]|izb\\.|izby|izba|izb)/i) || fullText.match(/(\\d)\\s*[-]?izb/i);
        if (roomsMatch) rooms = roomsMatch[1];
        if (!rooms && /garsónka|garsonka|1\\+kk|štúdio/i.test(fullText)) rooms = '1';
        
        var floorMatch = fullText.match(/na\\s*(\\d+)\\.?\\s*poschodí|(\\d+)\\.?\\s*poschodí\\s*z\\s*(\\d+)|(\\d+)\\/\\d+\\s*poschodí/i);
        if (floorMatch) floor = (floorMatch[1] || floorMatch[2] || floorMatch[4] || '').trim();
        if (!floor && /prízemie|prizemie/i.test(fullText)) floor = '0';
        if (!floor && /suterén|suterén/i.test(fullText)) floor = '-1';
        
        if (/kompletné?\\s*rekonštrukci|po\\s*rekonštrukci|zrekonštruovan/i.test(fullText)) condition = 'REKONSTRUKCIA';
        else if (/novostavba|nová\\s*stavba|nový\\s*byt/i.test(fullText)) condition = 'NOVOSTAVBA';
        else if (/pôvodný|povodný|pôvodný\\s*stav/i.test(fullText)) condition = 'POVODNY';

        var cityPart = locationText ? locationText.split(/[,|]/)[0].trim() : null;
        return {
            title: title || null,
            price_raw: price_raw || null,
            area_m2: area_m2 || null,
            rooms: rooms || null,
            floor: floor || null,
            condition: condition || null,
            description: desc || null,
            location: locationText ? { city: cityPart, full: locationText } : null,
            images: images,
            raw_address_context: raw_address_context,
            seller: {
                name: sellerName || (document.querySelector('.kontakt, .predajca')?.textContent?.trim()) || null,
                phone: (document.querySelector('a[href^="tel:"]')?.getAttribute('href') || '').replace('tel:', ''),
            },
            posted_at: document.querySelector('.datum, [class*="date"]')?.textContent?.trim() || null,
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
        const desc = document.querySelector('.description, [class*="popis"]')?.textContent?.trim();
        const loc = document.querySelector('.location, [class*="lokac"]')?.textContent?.trim();
        const raw_address_context = [loc, desc ? desc.substring(0, 200) : null].filter(Boolean).join('\\n\\n') || null;

        return {
            title: document.querySelector('h1')?.textContent?.trim(),
            price_raw: document.querySelector('.price, [class*="cena"]')?.textContent?.trim(),
            area_m2: document.querySelector('[class*="area"]')?.textContent?.trim(),
            description: desc,
            location: loc,
            images,
            raw_address_context,
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
