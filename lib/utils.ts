/** Join class names, dropping falsy values. Keeps deps minimal (no clsx). */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

/** Small async delay to simulate network latency in the mock service layer. */
export function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** RFC4122-ish id. Uses crypto.randomUUID when available. */
export function uid(prefix = ""): string {
  const base =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${base}` : base;
}

/** Current timestamp as ISO string. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Initials from a first/last name pair. */
export function initials(first?: string | null, last?: string | null): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}
