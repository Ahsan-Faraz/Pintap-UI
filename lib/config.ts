/**
 * App-wide constants and runtime flags.
 *
 * Phase 1 runs entirely on the mock service layer. Later phases flip
 * MOCK_DATA_ENABLED to route services at their real Supabase implementations.
 */

export const APP_NAME = "Pintap";
export const APP_SLOGAN = "Commerce by People";
export const APP_MISSION = "Monetize everyday recommendations.";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Mock mode is on unless explicitly disabled. Public so client components in
 * the service layer can read it during the frontend-first phase.
 */
export const MOCK_DATA_ENABLED =
  process.env.NEXT_PUBLIC_MOCK_DATA_ENABLED !== "false";

/**
 * Phase 2 swaps services from mock → real one at a time. A service is "live"
 * (uses its real Supabase adapter) when mock mode is globally off, or when its
 * name appears in NEXT_PUBLIC_LIVE_SERVICES (comma-separated, e.g. "auth,stores").
 */
const LIVE_SERVICES = new Set(
  (process.env.NEXT_PUBLIC_LIVE_SERVICES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export function isServiceLive(name: string): boolean {
  return !MOCK_DATA_ENABLED || LIVE_SERVICES.has(name);
}

export const SHORTCODE_LENGTH = 8;

/** Brand tokens mirrored for use in inline styles / charts (§9.1). */
export const BRAND = {
  navy: "#002E51",
  orange: "#FA5004",
  yellow: "#FFFD57",
  green: "#45DB89",
  beige: "#ECE7E4",
  blue: "#41C9FE",
  pink: "#FAB0E8",
  grayUi: "#E0DFE4",
} as const;
