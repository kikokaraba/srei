/**
 * Normalizuje pole fotiek z Apify / scrapingu na string[] a JSON-ready formát.
 * - vždy vráti pole (aj pri chybe), nikdy nehadzuje
 * - iba platné URL (http/https alebo //)
 * - // -> https:
 */

export function normalizeImages(raw: unknown): {
  urls: string[];
  thumbnailUrl: string | null;
} {
  let arr: unknown[] = [];
  try {
    if (Array.isArray(raw)) arr = raw;
  } catch {
    /* ignore */
  }
  const urls: string[] = [];
  for (const x of arr) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!s) continue;
    const normalized = s.startsWith("//") ? `https:${s}` : s;
    if (!normalized.startsWith("http")) continue;
    urls.push(normalized);
  }
  const thumbnailUrl = urls.length > 0 ? urls[0] : null;
  return { urls, thumbnailUrl };
}
