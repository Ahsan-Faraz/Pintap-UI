import { MOCK_DATA_ENABLED, isServiceLive } from "@/lib/config";

export { MOCK_DATA_ENABLED };

/**
 * Real adapters (Supabase) land in Phase 2+. Until a service has a
 * real implementation, pass `realStub()` so accidentally marking it live fails
 * loudly instead of silently returning nothing.
 */
export function realStub<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      return () => {
        throw new Error(
          `${name}.${String(prop)}(): real adapter not implemented yet (Phase 2+). ` +
            `Remove "${name.replace(/Service$/, "")}" from NEXT_PUBLIC_LIVE_SERVICES.`,
        );
      };
    },
  });
}

/**
 * Choose the mock or real implementation for a named service. Real wins when the
 * service is live — global mock mode is off, or the name is in the per-service
 * allow-list (see {@link isServiceLive}).
 */
export function pick<T extends object>(name: string, mock: T, real: T): T {
  return isServiceLive(name) ? real : mock;
}
