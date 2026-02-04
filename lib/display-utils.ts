/**
 * Pomocníky pre zobrazenie textov v UI (titulky inzerátov môžu obsahovať zvyšky HTML/skriptov).
 */

const JUNK_PATTERNS = [
  /requestAnimationFrame\s*\([^)]*\)[^;]*;?/gi,
  /\$RT\s*=\s*[^;]+;?/g,
  /(self\._next_f\s*=\s*self\._next_f\|\|\[\])\.[^;]+;?/gi,
  /United Classifieds\s*s\.r\.o\.?/gi,
  /GDPR/gi,
  /Ochrana osobných údajov/gi,
  /Ochrana údajov/gi,
  /Všeobecné obchodné podmienky/gi,
  /všetky práva vyhradené/gi,
  /©\s*[\d\s\-\.A-Za-z]*(United\s*Classifieds)?\s*s\.r\.o\.?/gi,
  /•/g,
  // Menu/footer Nehnutelnosti, Bazoš (bez \b – text môže byť bez medzier „MagazínUžitočné“)
  /Realitné kancelárie/gi,
  /Magazín/gi,
  /Užitočné info/gi,
  /Developerské projekty/gi,
  /novostavby/gi,
  /Ocenenie nehnuteľnosti/gi,
  /Hypotekárna kalkulačka/gi,
  /Ceny realít/gi,
  /Zmluvy/gi,
  /Pridať inzerát/gi,
  /Prihlásiť sa/gi,
  /Ako inzerovať/gi,
  /Podmienky inzercie/gi,
  /Firemná inzercia/gi,
  /Nastavenie súkromia/gi,
  /Nahlásenie nelegálneho obsahu/gi,
  /Pripomienky Nehnuteľnosti na Facebooku/gi,
  /self\.__next_f\s*=\s*self\.__next_f\|\|\[\]/gi,
  /self\.__next_f\.push\(\[[^\]]+\]\)/gi,
];

function stripJunk(t: string): string {
  let out = t.replace(/\s+/g, " ").trim();
  for (const re of JUNK_PATTERNS) {
    out = out.replace(re, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Vyčistí titulok nehnuteľnosti pre zobrazenie: odstráni skripty a boilerplate, zoberie prvý riadok, obmedzí dĺžku.
 */
export function formatPropertyTitle(raw: string | null | undefined, maxLength = 100): string {
  if (raw == null || typeof raw !== "string") return "";
  const t = stripJunk(raw);
  const firstLine = t.split("\n")[0]?.trim() || t;
  const out = firstLine.substring(0, maxLength).trim();
  return out || raw.substring(0, Math.min(maxLength, 80));
}

/**
 * Vyčistí a skráti ľubovoľný text (adresa, poznámka) pre zobrazenie.
 */
export function formatDisplayText(
  raw: string | null | undefined,
  maxLen = 60
): string {
  if (raw == null || typeof raw !== "string") return "";
  const t = stripJunk(raw).replace(/\s+/g, " ").trim();
  return t.substring(0, maxLen).trim() || "";
}

/**
 * Formátuje lokalitu (district, city) pre zobrazenie – vyčistí junk, obmedzí dĺžku.
 */
export function formatLocation(
  district: string | null | undefined,
  city: string | null | undefined,
  maxLen = 50
): string {
  const d = district ? stripJunk(district).substring(0, maxLen).trim() : "";
  const c = city ? stripJunk(city).substring(0, maxLen).trim() : "";
  if (d && c) return `${d}, ${c}`;
  return d || c || "";
}
