/**
 * Pomocníky pre zobrazenie textov v UI (titulky inzerátov môžu obsahovať zvyšky HTML/skriptov).
 */

const JUNK_PATTERNS = [
  /requestAnimationFrame\s*\([^)]*\)[^;]*;?/gi,
  /\$RT\s*=\s*[^;]+;?/g,
  /United Classifieds\s*s\.r\.o\.?/gi,
  /GDPR/gi,
  /Ochrana osobných údajov/gi,
  /Ochrana údajov/gi,
  /Všeobecné obchodné podmienky/gi,
  /všetky práva vyhradené/gi,
  /©\s*[\d\sA-Za-z]*/g,
];

/**
 * Vyčistí titulok nehnuteľnosti pre zobrazenie: odstráni skripty a boilerplate, zoberie prvý riadok, obmedzí dĺžku.
 */
export function formatPropertyTitle(raw: string | null | undefined, maxLength = 100): string {
  if (raw == null || typeof raw !== "string") return "";
  let t = raw.replace(/\s+/g, " ").trim();
  for (const re of JUNK_PATTERNS) {
    t = t.replace(re, " ");
  }
  t = t.replace(/\s+/g, " ").trim();
  const firstLine = t.split("\n")[0]?.trim() || t;
  const out = firstLine.substring(0, maxLength).trim();
  return out || raw.substring(0, maxLength);
}
