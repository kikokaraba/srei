"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

export interface PropertyImageProps {
  /** URL fotky (http/https). Null/empty => fallback. */
  url: string | null;
  alt: string;
  className?: string;
  /** Placeholder pri chýbajúcej URL alebo po onError. */
  fallback?: React.ReactNode;
  /** Použiť /api/image-proxy (obchádza hotlink). Default true. */
  useProxy?: boolean;
  loading?: "lazy" | "eager";
  /** Pomer strán (aspect-ratio) pre placeholder. */
  aspectRatio?: "video" | "square" | "auto";
  /** Vyplniť rodiča (absolute inset-0 w-full h-full object-cover). Pre karty v zozname. */
  fill?: boolean;
  [rest: string]: unknown;
}

const DEFAULT_FALLBACK = (
  <>
    <ImageOff className="w-8 h-8" />
    <span className="text-xs">Bez fotky</span>
  </>
);

function proxyUrl(url: string): string {
  if (!url.startsWith("http")) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Obrázok inzerátu s proxy (obchádza blokovanie portálov) a referrerPolicy.
 * Pri chýbajúcej URL alebo zlyhaní načítania zobrazí fallback.
 */
export function PropertyImage({
  url,
  alt,
  className = "",
  fallback = DEFAULT_FALLBACK,
  useProxy = true,
  loading = "lazy",
  aspectRatio = "video",
  fill = false,
  ...rest
}: PropertyImageProps) {
  const [errored, setErrored] = useState(false);

  const src = url && url.startsWith("http") ? (useProxy ? proxyUrl(url) : url) : null;

  const fillClass = fill ? "absolute inset-0 w-full h-full" : "";
  const imgClass = fill ? "object-cover" : "";

  if (!src || errored) {
    const wrapperClass = fill
      ? ""
      : aspectRatio === "video"
        ? "aspect-video"
        : aspectRatio === "square"
          ? "aspect-square"
          : "";
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 text-zinc-500 bg-zinc-800/50 overflow-hidden ${fillClass} ${wrapperClass} ${className}`.trim()}
      >
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={loading}
      className={`${fillClass} ${imgClass} ${className}`.trim()}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}
