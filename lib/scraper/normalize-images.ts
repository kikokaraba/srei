/**
 * Normalizuje pole fotiek z Apify / scrapingu na string[] a JSON-ready formát.
 * - vždy vráti pole (aj pri chybe), nikdy nehadzuje
 * - iba platné URL (http/https alebo //)
 * - // -> https:
 *
 * Ak raw nie je pole, skúsi z objektu polia: images, photos, imageUrls, mainImage (string → [string]).
 */
export function normalizeImages(raw: unknown): {
  urls: string[];
  thumbnailUrl: string | null;
} {
  let arr: unknown[] = [];
  try {
    if (Array.isArray(raw)) {
      arr = raw;
    } else if (raw && typeof raw === "object") {
      const o = raw as Record<string, unknown>;
      const from =
        o.images ?? o.photos ?? o.imageUrls ?? o.image ?? (o.mainImage != null ? [o.mainImage] : null);
      arr = Array.isArray(from) ? from : typeof from === "string" ? [from] : [];
    }
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
