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
  /©\s*[\d\sA-Za-z]*/g,
  // Menu/footer Nehnutelnosti, Bazoš
  /\bRealitné kancelárie\b/gi,
  /\bMagazín\b/gi,
  /\bUžitočné info\b/gi,
  /\bDeveloperské projekty\b/gi,
  /\bnovostavby\b/gi,
  /\bOcenenie nehnuteľnosti\b/gi,
  /\bHypotekárna kalkulačka\b/gi,
  /\bCeny realít\b/gi,
  /\bZmluvy\b/gi,
  /\bPridať inzerát\b/gi,
  /\bPrihlásiť sa\b/gi,
  /\bAko inzerovať\b/gi,
  /\bPodmienky inzercie\b/gi,
  /\bFiremná inzercia\b/gi,
  /\bNastavenie súkromia\b/gi,
  /\bNahlásenie nelegálneho obsahu\b/gi,
  /\bPripomienky Nehnuteľnosti na Facebooku\b/gi,
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
