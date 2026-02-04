/**
 * Pomocníky pre zobrazenie textov v UI – zobrazuje LEN čistú časť pred prvým junk.
 */

const JUNK_KEYWORDS = [
  "requestAnimationFrame",
  "$RT=",
  "self.__next_f",
  "self._next_f",
  "United Classifieds",
  "s.r.o.",
  "GDPR",
  "Ochrana osobných údajov",
  "Všeobecné obchodné podmienky",
  "©",
  "Realitné kancelárie",
  "Magazín",
  "Užitočné info",
  "Developerské projekty",
  "novostavby",
  "Ocenenie nehnuteľnosti",
  "Hypotekárna kalkulačka",
  "Ceny realít",
  "Zmluvy",
  "Pridať inzerát",
  "Prihlásiť sa",
  "Ako inzerovať",
  "Podmienky inzercie",
  "Firemná inzercia",
  "Nastavenie súkromia",
  "Nahlásenie nelegálneho obsahu",
  "Pripomienky Nehnuteľnosti na Facebooku",
];

function findFirstJunkIndex(text: string): number {
  const lower = text.toLowerCase();
  let first = text.length;
  for (const kw of JUNK_KEYWORDS) {
    const i = lower.indexOf(kw.toLowerCase());
    if (i >= 0 && i < first) first = i;
  }
  return first;
}

/** Vráti LEN časť textu pred prvým junk; nikdy nezobrazí junk. */
function extractCleanPrefix(raw: string, maxLen: number): string {
  const t = raw.replace(/\s+/g, " ").trim();
  const cut = findFirstJunkIndex(t);
  const clean = t.substring(0, cut).replace(/\s+/g, " ").trim();
  return clean.substring(0, maxLen).trim();
}

export function formatPropertyTitle(raw: string | null | undefined, maxLength = 100): string {
  if (raw == null || typeof raw !== "string") return "";
  return extractCleanPrefix(raw, maxLength);
}

export function formatDisplayText(
  raw: string | null | undefined,
  maxLen = 60
): string {
  if (raw == null || typeof raw !== "string") return "";
  return extractCleanPrefix(raw, maxLen);
}

export function formatLocation(
  district: string | null | undefined,
  city: string | null | undefined,
  maxLen = 50
): string {
  const d = district ? extractCleanPrefix(district, maxLen) : "";
  const c = city ? extractCleanPrefix(city, maxLen) : "";
  if (d && c) return `${d}, ${c}`;
  return d || c || "";
}
