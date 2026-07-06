/**
 * Pure URL and store-domain helpers for link creation and resolver redirects.
 * No SDK / network — safe to import on the client.
 */

const STORE_DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export function isValidStoreDomain(domain: string): boolean {
  return STORE_DOMAIN_REGEX.test(domain.trim().toLowerCase());
}

/** Normalize user input (https, www, paths) to a bare store domain, or null if invalid. */
export function normalizeStoreDomain(input: string): string | null {
  const host = normalizeHost(input);
  if (!host || !isValidStoreDomain(host)) return null;
  return host;
}

/** Lowercase host, strip protocol, path, port and a leading `www.`. */
export function normalizeHost(input: string): string {
  let host = input.trim().toLowerCase();
  try {
    if (host.includes("://")) host = new URL(host).host;
  } catch {
    /* fall through to manual parsing */
  }
  host = host.replace(/^https?:\/\//, "");
  host = host.split("/")[0];
  host = host.split(":")[0];
  host = host.replace(/^www\./, "");
  return host;
}

/** Extract a clean host from any URL string, or null if unparseable. */
export function extractHost(url: string): string | null {
  try {
    return normalizeHost(new URL(url).host);
  } catch {
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.trim())) {
      return normalizeHost(url);
    }
    return null;
  }
}

/** True for http(s) URLs only. */
export function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Normalize pasted link input: accepts bare domains (`ebay.com`), optional paths,
 * and full URLs. Returns a canonical https URL or null when unparseable.
 */
export function normalizeLinkUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = isHttpUrl(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = normalizeHost(url.host);
    if (!isValidStoreDomain(host)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function isValidLinkUrl(input: string): boolean {
  return normalizeLinkUrl(input) !== null;
}

/** Path + search of a destination URL (used as the `redirect` param). */
export function destinationPath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return "/";
  }
}

/**
 * Resolver redirect target. We used to build a Shopify-style
 * `https://domain/discount/CODE?redirect=/path` URL here, but that scheme only
 * exists on Shopify storefronts — on anything else (e.g. fahrrad-xxl.de) it
 * 404s. Stores carry no platform info, so always send visitors to the real
 * destination URL; the discount code is shown (and copyable) on the resolver.
 */
export function buildDiscountRedirectUrl(args: {
  primaryDomain: string | null;
  code: string | null;
  destinationUrl: string;
  storeConnected: boolean;
}): string {
  return args.destinationUrl;
}

/** Infer link type from a URL. */
export function inferLinkType(url: string): "product" | "shop" | "other" {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\/products?\//.test(path)) return "product";
    if (path === "/" || path === "") return "shop";
    if (/\/(collections|shop|store)\b/.test(path)) return "shop";
    return "other";
  } catch {
    return "other";
  }
}

/**
 * Fallback preview image for a host when the page has no scrapeable OG image
 * (bot-blocked storefronts etc.) — the site favicon via Google's cache.
 */
export function faviconUrl(host: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    normalizeHost(host),
  )}&sz=${size}`;
}

/** Best-effort human store name from a host, e.g. `acme-co` → `Acme Co`. */
export function storeNameFromHost(host: string): string {
  const label = normalizeHost(host).split(".")[0] ?? host;
  return label
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
