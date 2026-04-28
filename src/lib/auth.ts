import { supabase } from "./supabase";

/**
 * Admin SPA auth helpers — email + password.
 *
 * The allow-list lives server-side: every admin-api request runs through
 * `is_admin(auth.uid())`. A valid Supabase session is necessary but not
 * sufficient — only rows in `admins` actually get past the Edge Function.
 */
export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
