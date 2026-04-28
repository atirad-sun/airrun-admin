import { supabase } from "./supabase";

/**
 * Typed wrapper around the admin-api Edge Functions.
 *
 * Two functions, separated read/write:
 *   - admin-api-read   — pure reads (and one self-write: admins.last_login)
 *   - admin-api-write  — mutations + audit log
 *
 * Both follow the secure-api precedent: POST + JSON body with `{ action, ... }`.
 * Each call:
 *   1. Pulls the current Supabase Auth JWT.
 *   2. POSTs to /functions/v1/<fn-name> with `Authorization: Bearer <jwt>`.
 *   3. Throws an Error with the response body on non-2xx.
 *
 * The function code gates each request through `is_admin(auth.uid())` and
 * service-role-queries the underlying tables.
 */

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function callFunction<T = unknown>(
  fn: "admin-api-read" | "admin-api-write",
  body: { action: string } & Record<string, unknown>
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${FN_BASE}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `${fn} ${body.action} failed (${res.status}): ${text || res.statusText}`
    );
  }
  return (await res.json()) as T;
}

export function adminRead<T = unknown>(
  action: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  return callFunction<T>("admin-api-read", { action, ...args });
}

export function adminWrite<T = unknown>(
  action: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  return callFunction<T>("admin-api-write", { action, ...args });
}

// ── Typed action shapes ──

export interface OverviewResponse {
  counts: {
    parks: number;
    users: number;
    reports_total: number;
    reports_today: number;
    bugs_open: number;
    feedback_total: number;
  };
  aqi_distribution: { band: string; count: number }[];
  activity: { kind: string; created_at: string; summary: string }[];
}

export function fetchOverview(): Promise<OverviewResponse> {
  return adminRead<OverviewResponse>("overview");
}

export interface PingResponse {
  ok: true;
  caller: { email: string; role: "super_admin" | "editor" | "viewer" };
}

export function pingWrite(): Promise<PingResponse> {
  return adminWrite<PingResponse>("ping");
}
