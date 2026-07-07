import { defaultPathForRoles } from "@/lib/auth/routes";
import { db, saveDb } from "@/lib/mock/store";
import type { Profile, Role, SocialProfile } from "@/lib/types";
import { delay, nowIso } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Tables, TablesUpdate } from "@/lib/supabase/database.types";
import { pick } from "./_runtime";

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | "firstName"
    | "lastName"
    | "phone"
    | "country"
    | "avatarUrl"
    | "gender"
    | "socialProfiles"
  >
>;

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptedTerms: boolean;
  /** "merchant" adds the merchant role and routes to store onboarding. */
  accountType?: "user" | "merchant";
}

export interface AuthService {
  /** The signed-in user's profile, or null when there is no session. */
  getCurrentUser(): Promise<Profile | null>;
  loginWithPassword(
    email: string,
    password: string,
  ): Promise<{ user: Profile; defaultPath: string }>;
  /**
   * Create an account. With email confirmation enabled (double opt-in,
   * required in Germany) there is no session yet — `user` is null and
   * `defaultPath` points at the "check your inbox" screen.
   */
  signUp(
    input: SignUpInput,
  ): Promise<{ user: Profile | null; defaultPath: string }>;
  listUsers(): Promise<Profile[]>;
  updateProfile(patch: ProfilePatch): Promise<Profile>;
  uploadAvatar(file: File): Promise<string>;
  signOut(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  /**
   * Soft-delete the signed-in account: profile stays visible to admins for
   * payment history, links deactivate, and the auth user can't sign in again.
   */
  deleteAccount(): Promise<void>;
}

// --- Mock implementation (Phase 1) ---------------------------------------

const PASSWORD = "Pintap2026!";
const LOGIN_ACCOUNTS: Record<string, { userId: string; defaultPath: string }> = {
  "user@pintap.com": { userId: "user-amara", defaultPath: "/app" },
  "merchant@pintap.com": { userId: "user-mira", defaultPath: "/merchant" },
  "admin@pintap.com": { userId: "user-jordan", defaultPath: "/admin" },
  "i222637@nu.edu.pk": { userId: "user-amara", defaultPath: "/app" },
  "ahsanfaraz8535@gmail.com": { userId: "user-mira", defaultPath: "/merchant" },
};
/** Per-account passwords for mock login (falls back to PASSWORD). */
const LOGIN_PASSWORDS: Record<string, string> = {
  "i222637@nu.edu.pk": "Jan42007@",
  "ahsanfaraz8535@gmail.com": "ahsan123",
};

function mapSocialProfiles(value: unknown): SocialProfile[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .map((item) => ({
      platform: typeof item.platform === "string" ? item.platform : "",
      accountName:
        typeof item.accountName === "string" ? item.accountName : "",
    }))
    .filter((item) => item.platform && item.accountName);
}

const mock: AuthService = {
  async getCurrentUser() {
    await delay(120);
    const d = db();
    return d.profiles.find((p) => p.id === d.currentUserId) ?? null;
  },
  async loginWithPassword(email, password) {
    await delay(450);
    const normalizedEmail = email.trim().toLowerCase();
    const account = LOGIN_ACCOUNTS[normalizedEmail];
    const expectedPassword = LOGIN_PASSWORDS[normalizedEmail] ?? PASSWORD;
    if (!account || password !== expectedPassword) {
      throw new Error("Invalid email or password.");
    }
    const d = db();
    const user = d.profiles.find((p) => p.id === account.userId);
    if (!user) throw new Error("Account is not available.");
    d.currentUserId = user.id;
    saveDb(d);
    return { user, defaultPath: account.defaultPath };
  },
  async signUp(input) {
    await delay(500);
    const email = input.email.trim().toLowerCase();
    if (LOGIN_ACCOUNTS[email]) {
      throw new Error("An account with this email already exists.");
    }
    const d = db();
    const id = `user-${Date.now()}`;
    const merchant = input.accountType === "merchant";
    const user: Profile = {
      id,
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      avatarUrl: null,
      phone: null,
      country: null,
      gender: null,
      socialProfiles: [],
      acceptedTerms: input.acceptedTerms,
      roles: merchant ? ["user", "merchant"] : ["user"],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    d.profiles.push(user);
    d.currentUserId = id;
    saveDb(d);
    return {
      user,
      defaultPath: merchant ? "/merchant/onboarding" : "/auth/account-created",
    };
  },
  async listUsers() {
    await delay();
    return [...db().profiles];
  },
  async updateProfile(patch) {
    await delay();
    const d = db();
    const me = d.profiles.find((p) => p.id === d.currentUserId);
    if (!me) throw new Error("No current user");
    Object.assign(me, patch, { updatedAt: nowIso() });
    saveDb(d);
    return me;
  },
  async uploadAvatar(file) {
    await delay(150);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read avatar image."));
      reader.readAsDataURL(file);
    });
  },
  async signOut() {
    await delay(80);
  },
  async changePassword(currentPassword, newPassword) {
    await delay(400);
    if (currentPassword !== PASSWORD) {
      throw new Error("Current password is incorrect.");
    }
    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    // Mock mode keeps a fixed demo password, so nothing is persisted.
  },
  async deleteAccount() {
    await delay(400);
    // Demo accounts are shared fixtures — keep the profile, just end the session.
    const d = db();
    d.currentUserId = "";
    saveDb(d);
  },
};

// --- Real implementation (Supabase, Phase 2) -----------------------------

function mapProfile(row: Tables<"profiles">, roles: Role[]): Profile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    country: row.country,
    gender: row.gender,
    socialProfiles: mapSocialProfiles(row.social_profiles),
    acceptedTerms: row.accepted_terms,
    roles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  };
}

async function realGetCurrentUser(): Promise<Profile | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (profileRes.error || !profileRes.data) return null;
  const roles = (rolesRes.data ?? []).map((r) => r.role as Role);
  return mapProfile(profileRes.data, roles);
}

const real: AuthService = {
  getCurrentUser: realGetCurrentUser,
  async loginWithPassword(email, password) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(error.message);
    const user = await realGetCurrentUser();
    if (!user) throw new Error("Signed in, but your profile isn't ready yet.");
    return { user, defaultPath: defaultPathForRoles(user.roles) };
  },
  async signUp(input) {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as {
      error?: string;
      requiresConfirmation?: boolean;
    };
    if (!res.ok) {
      throw new Error(json.error ?? "Unable to create account.");
    }

    // TEMP: email confirmation is disabled for the test environment, so the API
    // auto-confirms the account (requiresConfirmation:false). Sign the user
    // straight in instead of routing to the "check your inbox" screen. When
    // email is back the API returns requiresConfirmation:true and we fall
    // through to the double opt-in path below.
    if (json.requiresConfirmation === false) {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });
      if (error) throw new Error(error.message);
      const user = await realGetCurrentUser();
      if (!user) throw new Error("Signed in, but your profile isn't ready yet.");
      return { user, defaultPath: defaultPathForRoles(user.roles) };
    }

    // Double opt-in: no session until the confirmation link is clicked.
    return {
      user: null,
      defaultPath: `/auth/verify?email=${encodeURIComponent(
        input.email.trim().toLowerCase(),
      )}`,
    };
  },
  async listUsers() {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in(
        "user_id",
        rows.map((r) => r.id),
      );
    const byUser = new Map<string, Role[]>();
    for (const r of roleRows ?? []) {
      const list = byUser.get(r.user_id) ?? [];
      list.push(r.role as Role);
      byUser.set(r.user_id, list);
    }
    return rows.map((r) => mapProfile(r, byUser.get(r.id) ?? []));
  },
  async updateProfile(patch) {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in.");

    const dbPatch: TablesUpdate<"profiles"> = {};
    if (patch.firstName !== undefined) dbPatch.first_name = patch.firstName;
    if (patch.lastName !== undefined) dbPatch.last_name = patch.lastName;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.country !== undefined) dbPatch.country = patch.country;
    if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;
    if (patch.gender !== undefined) dbPatch.gender = patch.gender;
    if (patch.socialProfiles !== undefined) {
      dbPatch.social_profiles = patch.socialProfiles.map((profile) => ({
        platform: profile.platform,
        accountName: profile.accountName,
      })) as TablesUpdate<"profiles">["social_profiles"];
    }

    const { error } = await supabase
      .from("profiles")
      .update(dbPatch)
      .eq("id", user.id);
    if (error) throw new Error(error.message);

    const me = await realGetCurrentUser();
    if (!me) throw new Error("Profile not found after update.");
    return me;
  },
  async uploadAvatar(file) {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in.");

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${safeExtension}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  },
  async signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
  },
  async changePassword(currentPassword, newPassword) {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) throw new Error("Not signed in.");
    // Re-authenticate with the current password before changing it, so a
    // hijacked session alone can't set a new password.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) throw new Error("Current password is incorrect.");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },
  async deleteAccount() {
    const res = await fetch("/api/auth/delete-account", { method: "POST" });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(json.error ?? "Could not delete account.");
    }
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
  },
};

export const authService = pick("auth", mock, real);
