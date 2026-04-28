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
  // R2.1 — admin-meta counts that drive the dashboard's metric cards +
  // quick-links section.  All present after the corresponding migration
  // 017 columns landed; older clients ignore extra fields so it's safe
  // to ship before every consumer is updated.
  counts_extra: {
    parks_visible: number;
    reports_new: number;
    feedback_new: number;
    bugs_high_open: number;
    parks_unverified: number;
  };
  aqi_distribution: { band: string; count: number }[];
  activity: { kind: string; created_at: string; summary: string }[];
  urgent_reports: Array<{
    id: number | string;
    park_id: string;
    park_name: string | null;
    category: string | null;
    status: string;
    severity: string;
    created_at: string;
  }>;
  urgent_bugs: Array<{
    id: string;
    title: string;
    status: string;
    severity: string;
    created_at: string;
  }>;
  top_parks: Array<{
    id: string;
    name: string;
    district: string | null;
    aqi: number;
    aqi_status: string; // 7-band: Good|Moderate|Poor|Bad|Hazardous|Unknown (pre-existing)
    visible: boolean;
    verified: boolean;
    aqi_updated_at: string | null;
  }>;
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

// ── Bugs ──

export type BugSeverity = "low" | "medium" | "high" | "critical";
export type BugStatus =
  | "open"
  | "triaged"
  | "in_progress"
  | "fixed"
  | "closed";

export interface BugListRow {
  id: string;
  title: string;
  severity: BugSeverity;
  area: string;
  status: BugStatus;
  owner: string | null;
  reporter_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bug extends BugListRow {
  description: string | null;
  steps: string | null;
  device: string | null;
  logs: string | null;
  reporter_user_id: string | null;
}

export interface BugsListResponse {
  bugs: BugListRow[];
}

export interface BugFilters {
  status?: BugStatus | BugStatus[];
  severity?: BugSeverity;
  area?: string;
  limit?: number;
}

export function fetchBugs(filters: BugFilters = {}): Promise<BugsListResponse> {
  const args: Record<string, unknown> = {};
  if (filters.status) {
    args.status = Array.isArray(filters.status)
      ? filters.status.join(",")
      : filters.status;
  }
  if (filters.severity) args.severity = filters.severity;
  if (filters.area) args.area = filters.area;
  if (filters.limit) args.limit = filters.limit;
  return adminRead<BugsListResponse>("bugs", args);
}

export function fetchBug(id: string): Promise<{ bug: Bug }> {
  return adminRead<{ bug: Bug }>("bug", { id });
}

export interface CreateBugInput {
  title: string;
  description?: string;
  steps?: string;
  device?: string;
  logs?: string;
  severity: BugSeverity;
  area: string;
  status?: BugStatus;
  reporter_name?: string;
  owner?: string;
}

export function createBug(
  input: CreateBugInput
): Promise<{ bug: Bug }> {
  return adminWrite<{ bug: Bug }>(
    "create-bug",
    input as unknown as Record<string, unknown>
  );
}

export type BugPatch = Partial<
  Pick<
    Bug,
    | "title"
    | "description"
    | "steps"
    | "device"
    | "logs"
    | "severity"
    | "area"
    | "status"
    | "owner"
    | "reporter_name"
  >
>;

export function patchBug(
  id: string,
  patch: BugPatch
): Promise<{ bug: Bug }> {
  return adminWrite<{ bug: Bug }>("patch-bug", { id, patch });
}

// ── Parks ──

export interface ParkListRow {
  id: string;
  name: string;
  district: string | null;
  lat: number;
  lng: number;
  station_name: string | null;
  track_length_km: number | null;
  open_time: string | null;
  close_time: string | null;
  visible: boolean;
  verified: boolean;
  aqi: number;
  aqi_status: string; // 7-band: Good|Moderate|Poor|Bad|Hazardous|Unknown (pre-existing)
  aqi_updated_at: string | null;
  reports_count: number;
}

// Detail view includes the AQI side-data the list omits (pm25, pm10,
// temperature, uv_index).  Same id shape as the list row so both can
// flow through the same drawer without copy-conversion.
export interface Park extends Omit<ParkListRow, "reports_count"> {
  pm25: number | null;
  pm10: number | null;
  temperature: number | null;
  uv_index: number | null;
}

export interface ParkReportRow {
  id: number;
  status: string;
  severity: string;
  category: string | null;
  created_at: string;
  user_id: string;
  user_name: string | null;
  message: string;
}

export type ParkPatch = Partial<
  Pick<
    ParkListRow,
    | "name"
    | "district"
    | "lat"
    | "lng"
    | "station_name"
    | "track_length_km"
    | "open_time"
    | "close_time"
    | "verified"
    | "visible"
  >
>;

export function fetchParks(): Promise<{ parks: ParkListRow[] }> {
  return adminRead<{ parks: ParkListRow[] }>("parks");
}

export function fetchPark(id: string): Promise<{ park: Park | null }> {
  return adminRead<{ park: Park | null }>("park", { id });
}

export function fetchParkReports(
  id: string
): Promise<{ reports: ParkReportRow[] }> {
  return adminRead<{ reports: ParkReportRow[] }>("park-reports", { id });
}

export function patchPark(
  id: string,
  patch: ParkPatch
): Promise<{ park: Park }> {
  return adminWrite<{ park: Park }>("patch-park", { id, patch });
}

export function togglePark(
  id: string,
  visible: boolean
): Promise<{ park: Park }> {
  return adminWrite<{ park: Park }>("toggle-park-visibility", { id, visible });
}
