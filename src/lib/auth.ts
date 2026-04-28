import { supabase } from "./supabase";

/**
 * Send a magic-link to `email`. The link redirects back to /auth/callback,
 * which reads the session and routes the user into the admin app.
 *
 * Real admin allow-list enforcement happens server-side via the `admin-api`
 * Edge Function — anyone with email auth can request a link, but only rows
 * present in `admins` can actually use the dashboard.
 */
export async function requestMagicLink(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
