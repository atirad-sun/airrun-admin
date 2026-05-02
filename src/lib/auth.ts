import { supabase } from "./supabase";
import { queryClient } from "./queries";

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
  // Clear the react-query cache before tearing down the session so a
  // subsequent sign-in on the same tab (e.g. switching from viewer to
  // super-admin) doesn't inherit the previous user's cached caller
  // role, parks list, etc.  RequireAuth's onAuthStateChange listener
  // catches sign-outs that happen via session expiry / forced rotation;
  // calling clear() here too is belt-and-braces for the manual button.
  queryClient.clear();
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
