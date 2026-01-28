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

    // IGNORUJ developerské projekty - majú inú štruktúru
    if (request.url.includes('/developersky-projekt/') || request.url.includes('/developer/')) {
        log.info('Preskakujem developerský projekt: ' + request.url);
        return null;
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
            location: { full: null, city: null, district: null, street: null },
            raw_address_context: null
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

        // Cena - viacero selektorov
        const priceSelectors = [
            '[class*="price-value"]',
            '[class*="price-main"]', 
            '[class*="detail-price"]',
            '.cena',
            '[data-testid="price"]',
            '.price',
            'span[class*="price"]',
            'div[class*="price"]'
        ];
        
        for (const sel of priceSelectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent) {
                const text = el.textContent.trim();
                // Musí obsahovať číslo alebo "dohodou"
                if (text.match(/\\d/) || text.toLowerCase().includes('dohodou')) {
                    result.price_raw = text;
                    break;
                }
            }
        }
        
        // Fallback: hľadaj v texte stránky vzor "XXX XXX €"
        if (!result.price_raw) {
            const bodyText = document.body.innerText;
            const priceMatch = bodyText.match(/(\\d{1,3}(?:\\s?\\d{3})+)\\s*€/);
            if (priceMatch) {
                result.price_raw = priceMatch[0];
            }
        }

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

        // ŠPECIALIZOVANÁ EXTRAKCIA PLOCHY - hľadá číslo pri m2
        const getArea = () => {
            const rows = Array.from(document.querySelectorAll('li, tr, .parameter-row, div, span'));
            for (const row of rows) {
                const text = row.textContent || '';
                const lower = text.toLowerCase();
                
                // Hľadáme riadok s "plocha" alebo "rozloha"
                if (lower.includes('plocha') || lower.includes('rozloha') || lower.includes('výmera')) {
                    // Priorita 1: číslo pred m2/m²
                    const m2Match = text.match(/(\\d+[\\d,.\\s]*)\\s*(m2|m²|metrov)/i);
                    if (m2Match) {
                        return m2Match[1].trim().replace(/\\s/g, '').replace(',', '.');
                    }
                    
                    // Priorita 2: číslo väčšie ako 15 (byty majú min 15m2)
                    const nums = text.match(/\\d+/g);
                    if (nums) {
                        const validNum = nums.find(n => parseInt(n) >= 15 && parseInt(n) <= 500);
                        if (validNum) return validNum;
                    }
                }
            }
            return null;
        };

        // Ak JSON-LD nemal plochu, použijeme špecializovanú funkciu
        if (!result.area_m2) {
            result.area_m2 = getArea();
        }
        
        // Fallback na generickú extrakciu
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

        // Lokácia - viacero stratégií
        // 1. Hľadaj v JSON-LD (najpresnejšie)
        try {
            const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of ldScripts) {
                const parsed = JSON.parse(script.textContent);
                const items = Array.isArray(parsed) ? parsed : [parsed];
                for (const item of items) {
                    if (item.address) {
                        if (typeof item.address === 'string') {
                            result.location.full = item.address;
                        } else {
                            result.location.street = item.address.streetAddress || null;
                            result.location.city = item.address.addressLocality || null;
                            result.location.district = item.address.addressRegion || null;
                            result.location.full = [
                                item.address.streetAddress,
                                item.address.addressLocality,
                                item.address.addressRegion
                            ].filter(Boolean).join(', ');
                        }
                    }
                }
            }
        } catch(e) {}
        
        // 2. PRIORITA: Zelený link s adresou pod titulkom (napr. "Zelená Stráň, Košice-Košická Nová Ves, okres Košice III")
        // Tento element je typicky link s ikonou mapy vedľa titulku
        const addressLinkSelectors = [
            'a[href*="/mapa"]',
            'a[href*="maps"]', 
            'a[href*="location"]',
            '.detail-location a',
            '.advertisement-location a',
            '[class*="location"] a',
            'h1 + div a',  // Link hneď za titulkom
            'h1 ~ a',
            '.detail-header a[href*="okres"]',
            'a[title*="mapa"]'
        ];
        
        for (const sel of addressLinkSelectors) {
            const addressLink = document.querySelector(sel);
            if (addressLink && addressLink.textContent) {
                const text = addressLink.textContent.trim();
                // Musí obsahovať čiarku (typický formát adresy) alebo "okres"
                if ((text.includes(',') || text.includes('okres')) && text.length > 5 && text.length < 150) {
                    result.location.full = text;
                    
                    // Parsuj: "Zelená Stráň, Košice-Košická Nová Ves, okres Košice III"
                    const parts = text.split(',').map(s => s.trim());
                    if (parts.length >= 1) {
                        result.location.street = parts[0]; // Zelená Stráň
                    }
                    if (parts.length >= 2) {
                        // Druhá časť môže byť "Košice-Košická Nová Ves"
                        const cityPart = parts[1];
                        // Extrahuj hlavné mesto (pred pomlčkou)
                        const mainCity = cityPart.split('-')[0].trim();
                        result.location.city = mainCity; // Košice
                        result.location.district = cityPart; // Košice-Košická Nová Ves
                    }
                    if (parts.length >= 3) {
                        // Tretia časť je okres
                        result.location.district = parts[2].replace('okres', '').trim(); // Košice III
                    }
                    break;
                }
            }
        }
        
        // 3. Hľadaj adresu v parametroch ak ešte nemáme
        if (!result.location.street) {
            const streetLabels = ['Ulica', 'Adresa', 'Lokalita'];
            for (const label of streetLabels) {
                const row = Array.from(document.querySelectorAll('.parameter-row, .table-row, tr, li, dt, dd'))
                    .find(el => el.textContent?.toLowerCase().includes(label.toLowerCase()));
                if (row) {
                    const val = row.querySelector('.value, .parameter-value, td:last-child, dd');
                    if (val) {
                        result.location.street = val.textContent.trim();
                        break;
                    }
                }
            }
        }
        
        // 4. Hľadaj v breadcrumbs alebo location elemente
        const locSelectors = [
            '.breadcrumb', 
            '[class*="breadcrumb"]',
            '[class*="location"]', 
            '.adresa', 
            '[class*="address"]',
            '.lokalita',
            '[itemprop="address"]'
        ];
        
        for (const sel of locSelectors) {
            if (result.location.full && result.location.city) break;
            const el = document.querySelector(sel);
            if (el) {
                const text = el.textContent.trim();
                if (text.length > 3 && text.length < 200) {
                    if (!result.location.full) result.location.full = text;
                    
                    // Parsuj mesto a okres z textu
                    const parts = text.split(/[,>\/]/).map(s => s.trim()).filter(Boolean);
                    if (parts.length >= 1 && !result.location.city) {
                        // Hľadaj známe mestá
                        const cities = ['Bratislava', 'Košice', 'Prešov', 'Žilina', 'Nitra', 'Banská Bystrica', 'Trnava', 'Trenčín', 'Martin', 'Poprad'];
                        for (const part of parts) {
                            for (const city of cities) {
                                if (part.toLowerCase().includes(city.toLowerCase())) {
                                    result.location.city = city;
                                    break;
                                }
                            }
                            if (result.location.city) break;
                        }
                        // Ak sme nenašli známe mesto, vezmi prvú časť
                        if (!result.location.city) {
                            result.location.city = parts[0];
                        }
                    }
                    if (parts.length >= 2 && !result.location.district) {
                        result.location.district = parts[1];
                    }
                    if (parts.length >= 3 && !result.location.street) {
                        result.location.street = parts[2];
                    }
                }
            }
        }
        
        // 4. Extrahuj z URL ako fallback
        if (!result.location.city) {
            const urlParts = window.location.pathname.split('/');
            for (const part of urlParts) {
                const cityMap = {
                    'bratislava': 'Bratislava',
                    'kosice': 'Košice',
                    'zilina': 'Žilina',
                    'presov': 'Prešov',
                    'nitra': 'Nitra',
                    'trnava': 'Trnava',
                    'trencin': 'Trenčín',
                    'banska-bystrica': 'Banská Bystrica',
                    'martin': 'Martin',
                    'poprad': 'Poprad'
                };
                if (cityMap[part]) {
                    result.location.city = cityMap[part];
                    break;
                }
            }
        }

        // 5. raw_address_context pre AI enrichment (lokalita + úvod popisu)
        const topLoc = document.querySelector('.top--location, [class*="top--location"]');
        const locText = topLoc && topLoc.textContent ? topLoc.textContent.trim() : null;
        const descSnippet = result.description ? result.description.substring(0, 200) : null;
        result.raw_address_context = [locText, descSnippet].filter(Boolean).join('\\n\\n') || null;

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
        const desc = document.querySelector('.popis, .text')?.textContent?.trim();
        const loc = document.querySelector('.lokalita')?.textContent?.trim();
        const raw_address_context = [loc, desc ? desc.substring(0, 200) : null].filter(Boolean).join('\\n\\n') || null;

        return {
            title: document.querySelector('h1, .nadpis')?.textContent?.trim(),
            price_raw: document.querySelector('.cena, .inzeratcena')?.textContent?.trim(),
            description: desc,
            location: loc,
            images,
            raw_address_context,
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
