import "server-only";

import crypto from "node:crypto";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NEGATIVE_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_HTML_BYTES = 500_000;

export type OgMeta = {
  imageUrl: string | null;
  title: string | null;
};

/**
 * Best-effort fetch of a page's preview image + title (Open Graph / Twitter
 * card). Runs server-side so it isn't blocked by CORS. Never throws — returns
 * nulls when the page can't be fetched, so callers can fall back to neutral
 * placeholders instead of misleading data.
 */
export async function fetchOgMeta(pageUrl: string): Promise<OgMeta> {
  const empty: OgMeta = { imageUrl: null, title: null };
  let target: URL;
  try {
    target = new URL(pageUrl);
  } catch {
    return empty;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return empty;

  const cacheKey = crypto.createHash("sha256").update(target.toString()).digest("hex");
  const cached = await readCachedMeta(cacheKey);
  if (cached.hit) return { imageUrl: cached.imageUrl, title: cached.title };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some storefronts (e.g. FahrradXXL, Tennis-Point) serve bot-blocking or
        // empty markup to non-browser agents — send a browser-like UA.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return empty;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return empty;

    // og/twitter tags live in <head>; cap the body we scan so a huge product
    // page can't blow up memory or the regex.
    const html = await readLimitedText(res, MAX_HTML_BYTES);
    const raw = extractImageUrl(html);
    const title = extractTitle(html);
    // Resolve protocol-relative and root-relative URLs against the final URL.
    const imageUrl = raw ? new URL(raw, res.url).toString() : null;
    await writeCachedMeta(cacheKey, target.toString(), imageUrl, title);
    return { imageUrl, title };
  } catch {
    return empty;
  } finally {
    clearTimeout(timer);
  }
}

/** Back-compat helper: preview image only. */
export async function fetchOgImage(pageUrl: string): Promise<string | null> {
  return (await fetchOgMeta(pageUrl)).imageUrl;
}

async function readCachedMeta(
  urlHash: string,
): Promise<{ hit: boolean; imageUrl: string | null; title: string | null }> {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const minFetchedAt = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    const { data } = await supabase
      .from("og_image_cache")
      .select("image_url, title, fetched_at")
      .eq("url_hash", urlHash)
      .gte("fetched_at", minFetchedAt)
      .maybeSingle();
    if (!data) return { hit: false, imageUrl: null, title: null };
    if (!data.image_url) {
      const fetchedAt = +new Date(data.fetched_at);
      const freshNegativeHit =
        Number.isFinite(fetchedAt) &&
        Date.now() - fetchedAt < NEGATIVE_CACHE_TTL_MS;
      return freshNegativeHit
        ? { hit: true, imageUrl: null, title: data.title ?? null }
        : { hit: false, imageUrl: null, title: null };
    }
    return { hit: true, imageUrl: data.image_url, title: data.title ?? null };
  } catch {
    return { hit: false, imageUrl: null, title: null };
  }
}

async function writeCachedMeta(
  urlHash: string,
  pageUrl: string,
  imageUrl: string | null,
  title: string | null,
): Promise<void> {
  try {
    const supabase = createSupabaseServiceRoleClient();
    await supabase.from("og_image_cache").upsert(
      {
        url_hash: urlHash,
        page_url: pageUrl,
        image_url: imageUrl,
        title,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "url_hash" },
    );
  } catch {
    // Cache failures should never block link creation.
  }
}

async function readLimitedText(res: Response, limit: number): Promise<string> {
  if (!res.body) return (await res.text()).slice(0, limit);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let total = 0;

  while (total < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = limit - total;
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    html += decoder.decode(chunk, { stream: true });
    total += chunk.byteLength;
    if (value.byteLength > remaining) {
      await reader.cancel();
      break;
    }
  }

  html += decoder.decode();
  return html;
}

const META_KEYS = [
  "og:image:secure_url",
  "og:image:url",
  "og:image",
  "twitter:image",
  "twitter:image:src",
];

function extractImageUrl(html: string): string | null {
  const byKey = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag
      .match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]
      ?.toLowerCase();
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (key && content && !byKey.has(key)) byKey.set(key, content);
  }
  for (const key of META_KEYS) {
    const value = byKey.get(key);
    if (value?.trim()) return decodeEntities(value.trim());
  }

  const jsonLdImage = extractJsonLdImageUrl(html);
  if (jsonLdImage) return jsonLdImage;

  // Legacy fallback used by some sites.
  const linkImage = html
    .match(/<link\b[^>]*\brel\s*=\s*["']image_src["'][^>]*>/i)?.[0]
    ?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  return linkImage ? decodeEntities(linkImage.trim()) : null;
}

const TITLE_META_KEYS = ["og:title", "twitter:title"];

/**
 * Product/page title from Open Graph / Twitter meta, falling back to the
 * document <title>. Returns null when nothing usable is found so callers can
 * fall back to a URL-derived name.
 */
function extractTitle(html: string): string | null {
  const byKey = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag
      .match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]
      ?.toLowerCase();
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (key && content && !byKey.has(key)) byKey.set(key, content);
  }
  for (const key of TITLE_META_KEYS) {
    const value = byKey.get(key);
    if (value?.trim()) return cleanTitle(decodeEntities(value));
  }

  const docTitle = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (docTitle?.trim()) return cleanTitle(decodeEntities(docTitle));
  return null;
}

/** Collapse whitespace and cap length; empty → null. */
function cleanTitle(value: string): string | null {
  const trimmed = value.replace(/\s+/g, " ").trim().slice(0, 140);
  return trimmed || null;
}

function extractJsonLdImageUrl(html: string): string | null {
  for (const tag of html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? []) {
    const type = tag
      .match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]
      ?.toLowerCase();
    if (type !== "application/ld+json") continue;

    const body = tag
      .replace(/^<script\b[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    if (!body) continue;

    try {
      const parsed = JSON.parse(decodeEntities(body)) as unknown;
      const [image] = collectProductImages(parsed);
      if (image) return image;
    } catch {
      const fallback = extractJsonLdImageFallback(body);
      if (fallback) return fallback;
    }
  }
  return null;
}

function collectProductImages(
  value: unknown,
  inProduct = false,
  depth = 0,
): string[] {
  if (depth > 8 || value == null) return [];
  if (typeof value === "string") return inProduct ? [value] : [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectProductImages(item, inProduct, depth + 1));
  }
  if (typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  const productScope = inProduct || hasSchemaType(record["@type"], "Product");
  const images: string[] = [];

  if (productScope) {
    images.push(...collectImageValues(record.image, depth + 1));
    images.push(...collectImageValues(record.thumbnailUrl, depth + 1));
  }

  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") {
      images.push(...collectProductImages(nested, productScope, depth + 1));
    }
  }

  return images;
}

function collectImageValues(value: unknown, depth = 0): string[] {
  if (depth > 8 || value == null) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectImageValues(item, depth + 1));
  }
  if (typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  const images: string[] = [];
  images.push(...collectImageValues(record.url, depth + 1));
  images.push(...collectImageValues(record.contentUrl, depth + 1));
  return images;
}

function hasSchemaType(value: unknown, expected: string): boolean {
  if (typeof value === "string") return value.toLowerCase() === expected.toLowerCase();
  if (Array.isArray(value)) return value.some((item) => hasSchemaType(item, expected));
  return false;
}

function extractJsonLdImageFallback(body: string): string | null {
  const match = body.match(/"image"\s*:\s*(?:\[\s*)?"([^"]+)"/i);
  return match?.[1] ? decodeEntities(decodeJsonUrl(match[1].trim())) : null;
}

function decodeJsonUrl(value: string): string {
  return value
    .replace(/\\\//g, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003d/gi, "=");
}

/** Decode HTML entities that show up in scraped OG titles and meta content. */
function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#x26;/gi, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ouml;/gi, "ö")
    .replace(/&auml;/gi, "ä")
    .replace(/&uuml;/gi, "ü")
    .replace(/&Ouml;/gi, "Ö")
    .replace(/&Auml;/gi, "Ä")
    .replace(/&Uuml;/gi, "Ü")
    .replace(/&szlig;/gi, "ß")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    );
}
