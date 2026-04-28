import { supabase } from "./supabase";

/**
 * Typed wrapper around the `admin-api` Edge Function. Every call:
 *   1. Pulls the current Supabase Auth JWT.
 *   2. Hits `${VITE_SUPABASE_URL}/functions/v1/admin-api/<path>` with it.
 *   3. Throws on non-2xx with the error body for inspection.
 *
 * The Edge Function gates each request through `is_admin(auth.uid())` and
 * service_role-queries the underlying tables.
 */

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

async function authedFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  return fetch(`${FN_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
}

export async function adminGet<T = unknown>(path: string): Promise<T> {
  const res = await authedFetch(path);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function adminPost<T = unknown>(
  path: string,
  body: unknown
): Promise<T> {
  const res = await authedFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function adminPatch<T = unknown>(
  path: string,
  body: unknown
): Promise<T> {
  const res = await authedFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function adminDelete<T = unknown>(path: string): Promise<T> {
  const res = await authedFetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}
