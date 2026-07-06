import type { Role } from "@/lib/types";

/** Portal prefixes and the role required to access them. */
export const PORTAL_ROLE: Record<string, Role> = {
  "/app": "user",
  "/merchant": "merchant",
  "/admin": "admin",
};

const PROTECTED_PREFIXES = ["/app", "/merchant", "/admin"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Which role is required for this path, if any. */
export function requiredRoleForPath(pathname: string): Role | null {
  for (const [prefix, role] of Object.entries(PORTAL_ROLE)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return role;
  }
  return null;
}

export function userHasRole(roles: Role[], role: Role): boolean {
  return roles.includes(role);
}

/** Highest-privilege landing path for a set of roles. */
export function defaultPathForRoles(roles: Role[]): string {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("merchant")) return "/merchant";
  return "/app";
}
