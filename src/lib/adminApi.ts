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
  caller: {
    email: string;
    role: "super_admin" | "editor" | "viewer";
    must_change_password: boolean;
  };
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

// Add Park V1 — minimal create flow.  Only the fields the dialog
// collects; the rest stay at their defaults (visible=false, verified=
// false, name_en=name, station_distance_km=0) and are refined via the
// existing Edit drawer.
export interface CreateParkInput {
  name: string;
  district: string | null;
  lat: number;
  lng: number;
  station_name: string | null;
}

export function createPark(input: CreateParkInput): Promise<{ park: Park }> {
  return adminWrite<{ park: Park }>(
    "create-park",
    input as unknown as Record<string, unknown>
  );
}

export function togglePark(
  id: string,
  visible: boolean
): Promise<{ park: Park }> {
  return adminWrite<{ park: Park }>("toggle-park-visibility", { id, visible });
}

// ── Users ──

export type UserStatus = "active" | "inactive" | "suspended";

export interface UserListRow {
  id: string; // LINE userId
  display_name: string;
  picture_url: string | null;
  status: UserStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  saved_parks_count: number;
  reports_count: number;
  feedback_count: number;
}

export interface UserSavedPark {
  id: string;
  saved_at: string;
  name: string;
  district: string | null;
  aqi: number;
  aqi_status: string;
}

export interface UserReport {
  id: number;
  park_id: string;
  status: string;
  severity: string;
  category: string | null;
  weather: string | null;
  air_quality: string | null;
  crowd: string | null;
  created_at: string;
}

export interface UserFeedback {
  id: number;
  category: string;
  rating: number;
  message: string;
  status: string;
  created_at: string;
}

// Detail view extends list-row with the LIFF-side preferences + the
// hydrated activity arrays.  The patch-user-notes write returns just
// the list row's fields (counts may be null on the write response —
// frontend re-fetches the list after a successful patch).
export interface User extends UserListRow {
  run_time: string | null;
  notify_enabled: boolean;
  notify_time: string | null;
  saved_parks: UserSavedPark[];
  reports: UserReport[];
  feedback: UserFeedback[];
}

export type UserPatch = Partial<{
  admin_notes: string | null;
  status: UserStatus;
}>;

export function fetchUsers(): Promise<{ users: UserListRow[] }> {
  return adminRead<{ users: UserListRow[] }>("users");
}

export function fetchUser(id: string): Promise<{ user: User | null }> {
  return adminRead<{ user: User | null }>("user", { id });
}

export function patchUser(
  id: string,
  patch: UserPatch
): Promise<{ user: UserListRow }> {
  return adminWrite<{ user: UserListRow }>("patch-user-notes", { id, patch });
}

// ── Reports (D3) ──

export type ReportStatus = "new" | "reviewing" | "resolved" | "dismissed";
export type ReportSeverity = "low" | "medium" | "high";

// List + detail use the same hydrated shape — backend returns
// park_name + user_name resolved from in-memory maps so the frontend
// never has to do its own lookup. Photo URLs are public Supabase
// Storage links; CSP already covers https://*.supabase.co.
export interface ReportListRow {
  id: number;
  park_id: string;
  park_name: string | null;
  user_id: string;
  user_name: string | null;
  status: ReportStatus;
  severity: ReportSeverity;
  category: string | null;
  weather: string | null;
  air_quality: string | null;
  crowd: string | null;
  photo_url: string | null;
  message: string | null;
  resolution: string | null;
  created_at: string;
}

export type Report = ReportListRow;

export type ReportPatch = Partial<{
  status: ReportStatus;
  severity: ReportSeverity;
  category: string | null;
  resolution: string | null;
}>;

export function fetchReports(): Promise<{ reports: ReportListRow[] }> {
  return adminRead<{ reports: ReportListRow[] }>("reports");
}

export function fetchReport(id: number): Promise<{ report: Report }> {
  return adminRead<{ report: Report }>("report", { id });
}

export function patchReport(
  id: number,
  patch: ReportPatch
): Promise<{ report: Report }> {
  return adminWrite<{ report: Report }>("patch-report", { id, patch });
}

// ── Feedback (D4) ──
//
// Two parallel category enums per the option-(c) decision (see plan
// d4-feedback.md): LIFF stays on the 3-bucket `category`, admin SPA
// re-tags into `category_admin`. Both columns coexist on the row.

export type FeedbackStatus = "new" | "tagged" | "responded" | "archived";
export type FeedbackSentiment = "positive" | "negative" | "neutral";
export type FeedbackCategoryUser = "bug" | "feature" | "general";
export type FeedbackCategoryAdmin =
  | "feature_request"
  | "complaint"
  | "praise"
  | "usability"
  | "data_quality";

export interface FeedbackListRow {
  id: number;
  user_id: string | null;
  user_name: string | null;
  category: FeedbackCategoryUser;
  category_admin: FeedbackCategoryAdmin | null;
  sentiment: FeedbackSentiment | null;
  rating: number;
  message: string;
  tags: string[];
  status: FeedbackStatus;
  assignee: string | null;
  linked_park_id: string | null;
  linked_park_name: string | null;
  linked_bug_id: string | null;
  linked_bug_title: string | null;
  created_at: string;
}

export type Feedback = FeedbackListRow;

export type FeedbackPatch = Partial<{
  status: FeedbackStatus;
  category_admin: FeedbackCategoryAdmin | null;
  sentiment: FeedbackSentiment | null;
  tags: string[];
  assignee: string | null;
  linked_park_id: string | null;
  linked_bug_id: string | null;
}>;

export function fetchFeedback(): Promise<{ feedback: FeedbackListRow[] }> {
  return adminRead<{ feedback: FeedbackListRow[] }>("feedback");
}

export function fetchFeedbackItem(
  id: number
): Promise<{ feedback: Feedback }> {
  return adminRead<{ feedback: Feedback }>("feedback_item", { id });
}

export function patchFeedback(
  id: number,
  patch: FeedbackPatch
): Promise<{ feedback: Feedback }> {
  return adminWrite<{ feedback: Feedback }>("patch-feedback", { id, patch });
}

// ── Settings — admins + audit (D5) ──
//
// All admin-management actions are super-admin only on the server.
// Frontend hides UI for non-super-admins via the useCallerRole hook;
// server returns 403 either way.

export type AdminRole = "super_admin" | "editor" | "viewer";
export type AdminStatus = "active" | "inactive";

export interface AdminRow {
  user_id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: AdminStatus;
  created_at: string;
  last_login: string | null;
}

export interface AuditRow {
  id: number;
  admin_id: string | null;
  admin_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export type AdminPatch = Partial<Pick<AdminRow, "name" | "role" | "status">>;

export interface CreateAdminInput {
  email: string;
  role: AdminRole;
}

export interface AuditPage {
  audit: AuditRow[];
  has_more: boolean;
}

export function fetchAdmins(): Promise<{ admins: AdminRow[] }> {
  return adminRead<{ admins: AdminRow[] }>("admins");
}

export function fetchAudit(args: {
  before_id?: number;
  limit?: number;
} = {}): Promise<AuditPage> {
  const body: Record<string, unknown> = {};
  if (typeof args.before_id === "number") body.before_id = args.before_id;
  if (typeof args.limit === "number") body.limit = args.limit;
  return adminRead<AuditPage>("audit", body);
}

export interface CreateAdminResponse {
  admin: AdminRow;
  // Present only when this call provisioned a new auth.users row.
  // Re-invites of an existing email omit it (the existing user keeps
  // their password).  Show once to the inviter to share out-of-band.
  tempPassword?: string;
}

export function createAdmin(
  input: CreateAdminInput
): Promise<CreateAdminResponse> {
  return adminWrite<CreateAdminResponse>(
    "create-admin",
    input as unknown as Record<string, unknown>
  );
}

export function patchAdmin(
  user_id: string,
  patch: AdminPatch
): Promise<{ admin: AdminRow }> {
  return adminWrite<{ admin: AdminRow }>("patch-admin", { user_id, patch });
}

export function deleteAdmin(user_id: string): Promise<{ ok: true }> {
  return adminWrite<{ ok: true }>("delete-admin", { user_id });
}

export interface ChangePasswordInput {
  new_password: string;
  // Required for normal rotations from Settings.  Omitted (or
  // ignored) for forced rotations on first login — the live session
  // is the proof of identity in that case.
  current_password?: string;
}

export function changePassword(
  input: ChangePasswordInput
): Promise<{ ok: true }> {
  return adminWrite<{ ok: true }>(
    "change-password",
    input as unknown as Record<string, unknown>
  );
}
