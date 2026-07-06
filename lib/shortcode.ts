import { SHORTCODE_LENGTH } from "./config";

/** Base62 alphabet for short codes (§2.4: 8 base62 characters). */
const BASE62 =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Generate a random base62 short code (default length 8). */
export function generateShortCode(length = SHORTCODE_LENGTH): string {
  let out = "";
  const cryptoObj =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto
      : null;
  if (cryptoObj) {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < length; i++) out += BASE62[bytes[i] % BASE62.length];
  } else {
    for (let i = 0; i < length; i++) {
      out += BASE62[Math.floor(Math.random() * BASE62.length)];
    }
  }
  return out;
}

/** Validate a short code: exactly N base62 characters. */
export function isValidShortCode(
  code: string,
  length = SHORTCODE_LENGTH,
): boolean {
  return new RegExp(`^[0-9A-Za-z]{${length}}$`).test(code);
}

/** Generate a code that is not already present in `taken`. */
export function generateUniqueShortCode(
  taken: Set<string> | string[],
  length = SHORTCODE_LENGTH,
): string {
  const set = Array.isArray(taken) ? new Set(taken) : taken;
  let code = generateShortCode(length);
  while (set.has(code)) code = generateShortCode(length);
  return code;
}
