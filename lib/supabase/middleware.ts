import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@/lib/types";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export type SessionUser = {
  id: string;
  email: string | undefined;
  roles: Role[];
};

function rolesFromClaims(claims: Record<string, unknown>): Role[] {
  const appMetadata =
    claims.app_metadata && typeof claims.app_metadata === "object"
      ? (claims.app_metadata as Record<string, unknown>)
      : {};
  const raw =
    claims.roles ??
    claims.user_roles ??
    appMetadata.roles ??
    appMetadata.user_roles;
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];
  return values
    .map((r) => String(r).trim())
    .filter((r): r is Role => r === "user" || r === "merchant" || r === "admin");
}

async function rolesForUser(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
): Promise<Role[]> {
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  return (roleRows ?? []).map((r) => r.role as Role);
}

/**
 * Refreshes the Supabase auth session for a request and returns the response (with
 * any rotated cookies) plus the current user and their roles.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const claimsResult = await supabase.auth.getClaims();
  const claims = claimsResult.data?.claims as Record<string, unknown> | undefined;

  if (claims?.sub && typeof claims.sub === "string") {
    const claimRoles = rolesFromClaims(claims);
    const roles = claimRoles.length
      ? claimRoles
      : await rolesForUser(supabase, claims.sub);
    return {
      response,
      user: {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : undefined,
        roles,
      } satisfies SessionUser,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response, user: null as SessionUser | null };
  }

  const roles = await rolesForUser(supabase, user.id);

  return {
    response,
    user: {
      id: user.id,
      email: user.email,
      roles,
    } satisfies SessionUser,
  };
}
