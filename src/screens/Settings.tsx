// Port of airrun-design/project/admin-page-settings.jsx (SettingsPage).
// 4-tab layout: Admins / Data Sources / Notifications / Audit Log.
//
// Backend wired in D5 Phase A (PR #39). Super-admin gating is enforced
// server-side; this screen reads `useCallerRole()` to decide whether
// to render the Admins + Audit content or a "no permission" empty
// state for editor/viewer roles. Data Sources + Notifications tabs
// are decorative per the master plan.

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAdmin,
  deleteAdmin,
  fetchAdmins,
  fetchAudit,
  patchAdmin,
  type AdminRole,
  type AdminRow,
  type AuditRow,
} from "@/lib/adminApi";
import { qk } from "@/lib/queries";
import { useCallerRole } from "@/lib/useCallerRole";
import Btn from "@/components/Btn";
import Card from "@/components/Card";
import Chip from "@/components/Chip";
import ConfirmModal from "@/components/ConfirmModal";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import PageHeader from "@/components/PageHeader";
import Tabs from "@/components/Tabs";
import { IC } from "@/components/icons";

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  viewer: "Viewer",
};
const ROLE_COLORS: Record<AdminRole, { fg: string; bg: string }> = {
  super_admin: { fg: "#04A074", bg: "#F0FDF8" },
  editor: { fg: "#1888FF", bg: "#EBF3FF" },
  viewer: { fg: "#777D86", bg: "#F3F4F6" },
};

const ROLE_OPTIONS: AdminRole[] = ["super_admin", "editor", "viewer"];

const TAB_LIST = [
  { id: "admins", label: "Admin Users" },
  { id: "datasource", label: "Data Sources" },
  { id: "notifications", label: "Notifications" },
  { id: "audit", label: "Audit Log" },
] as const;

type TabId = (typeof TAB_LIST)[number]["id"];

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0].length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Settings() {
  const [tab, setTab] = useState<TabId>("admins");

  return (
    <div>
      <PageHeader
        title="Settings"
        sub="Workspace configuration and admin management"
      />

      <Card>
        <div style={{ padding: "0 20px", borderBottom: "1px solid #EDF0F3" }}>
          <Tabs
            tabs={[...TAB_LIST]}
            active={tab}
            onChange={(id) => setTab(id as TabId)}
          />
        </div>
        <div style={{ padding: "24px 20px" }}>
          {tab === "admins" && <AdminsTab />}
          {tab === "datasource" && <DataSourcesTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "audit" && <AuditTab />}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admins tab
// ─────────────────────────────────────────────────────────────────────────────

function AdminsTab() {
  const queryClient = useQueryClient();
  const { caller, isLoading: callerLoading } = useCallerRole();

  // Drive these from caller-role; only super-admins fetch the list
  // (server returns 403 anyway for editor/viewer, no point trying).
  const enabled = caller?.isSuperAdmin === true;
  const { data: admins, error: loadErr } = useQuery({
    queryKey: qk.admins(),
    queryFn: () => fetchAdmins().then((r) => r.admins),
    enabled,
  });

  const invalidateAdmins = useCallback(
    () => queryClient.invalidateQueries({ queryKey: qk.admins() }),
    [queryClient]
  );

  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<AdminRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handlePatchRole = useCallback(
    async (row: AdminRow, role: AdminRole) => {
      setActionError(null);
      try {
        await patchAdmin(row.user_id, { role });
        invalidateAdmins();
      } catch (err) {
        setActionError((err as Error).message);
      }
    },
    [invalidateAdmins]
  );

  const handleDelete = useCallback(
    async (row: AdminRow) => {
      setActionError(null);
      try {
        await deleteAdmin(row.user_id);
        invalidateAdmins();
      } catch (err) {
        setActionError((err as Error).message);
      }
    },
    [invalidateAdmins]
  );

  if (callerLoading) return <LoadingState />;
  if (!caller?.isSuperAdmin) {
    return (
      <EmptyState
        title="Super admin access required"
        desc="You don't have permission to view or manage admin users."
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "#24262B" }}>
          Admin Users
        </div>
        <Btn
          variant="brand"
          size="sm"
          onClick={() => {
            setActionError(null);
            setInviteOpen(true);
          }}
        >
          {IC.plus} Invite Admin
        </Btn>
      </div>

      {actionError && (
        <div
          style={{
            fontSize: 12,
            color: "#EF4B4B",
            background: "#FFF1F1",
            padding: "8px 12px",
            borderRadius: 8,
            marginBottom: 12,
          }}
          role="alert"
        >
          {actionError}
        </div>
      )}

      {loadErr ? (
        <div
          style={{
            padding: 16,
            color: "#EF4B4B",
            fontSize: 13,
            background: "#FFF1F1",
            borderRadius: 8,
          }}
          role="alert"
        >
          Failed to load: {loadErr.message}
        </div>
      ) : !admins ? (
        <LoadingState />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {admins.map((a) => (
            <AdminRowView
              key={a.user_id}
              row={a}
              callerEmail={caller.email}
              onPatchRole={handlePatchRole}
              onRequestRevoke={() => setConfirmRevoke(a)}
            />
          ))}
        </div>
      )}

      <RolePermissionsExplainer />

      <InviteAdminDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmitted={() => {
          setInviteOpen(false);
          invalidateAdmins();
        }}
        onError={setActionError}
      />

      <ConfirmModal
        open={!!confirmRevoke}
        onOpenChange={(o) => !o && setConfirmRevoke(null)}
        onConfirm={() => {
          if (confirmRevoke) void handleDelete(confirmRevoke);
        }}
        title="Remove admin"
        message={
          confirmRevoke
            ? `Remove ${confirmRevoke.name} (${confirmRevoke.email}) from the admin team? They will lose all access immediately.`
            : ""
        }
        confirmLabel="Remove admin"
        danger
      />
    </div>
  );
}

function AdminRowView({
  row,
  callerEmail,
  onPatchRole,
  onRequestRevoke,
}: {
  row: AdminRow;
  callerEmail: string;
  onPatchRole: (row: AdminRow, role: AdminRole) => void | Promise<void>;
  onRequestRevoke: () => void;
}) {
  // Self-detection: backend is the real check via caller.userId, but
  // matching email is good enough to disable destructive controls
  // for the row representing the current user.
  const isSelf = row.email === callerEmail;
  const roleColor = ROLE_COLORS[row.role];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        border: "1px solid #EDF0F3",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#F0FDF8",
          border: "1px solid #A7F3D0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "#04A074" }}>
          {initialsFor(row.name)}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#24262B",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {row.name}
          {isSelf && (
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 10,
                background: "#EDF0F3",
                color: "#777D86",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              You
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#777D86" }}>{row.email}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Select
          value={row.role}
          onValueChange={(v) => void onPatchRole(row, v as AdminRole)}
          disabled={isSelf}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                <span style={{ color: ROLE_COLORS[r].fg, fontWeight: 600 }}>
                  {ROLE_LABELS[r]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span
          style={{
            fontSize: 11,
            color: "#B6C7D6",
            whiteSpace: "nowrap",
          }}
        >
          Last login:{" "}
          {row.last_login
            ? new Date(row.last_login).toLocaleDateString()
            : "Never"}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: roleColor.fg,
            background: roleColor.bg,
            padding: "2px 8px",
            borderRadius: 4,
          }}
        >
          {ROLE_LABELS[row.role]}
        </span>
        <Chip status={row.status} />
        {!isSelf && (
          <button
            onClick={onRequestRevoke}
            aria-label={`Remove ${row.name}`}
            style={{
              background: "none",
              border: "none",
              padding: 4,
              cursor: "pointer",
              color: "#EF4B4B",
              display: "flex",
              alignItems: "center",
            }}
          >
            {IC.trash}
          </button>
        )}
      </div>
    </div>
  );
}

function RolePermissionsExplainer() {
  return (
    <div
      style={{
        marginTop: 20,
        padding: "14px 16px",
        background: "#FFFBEB",
        border: "1px solid #FDE68A",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#92400E",
          marginBottom: 4,
        }}
      >
        Role permissions
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {[
          {
            role: "Viewer",
            perms: [
              "Read parks, users, reports",
              "View dashboard metrics",
              "No write access",
            ],
          },
          {
            role: "Editor",
            perms: [
              "All viewer permissions",
              "Edit parks & reports",
              "Resolve bugs & feedback",
            ],
          },
          {
            role: "Super Admin",
            perms: [
              "All editor permissions",
              "Manage admin users",
              "Access audit log",
              "Change data sources",
            ],
          },
        ].map((r) => (
          <div key={r.role} style={{ fontSize: 12 }}>
            <div
              style={{ fontWeight: 600, color: "#24262B", marginBottom: 4 }}
            >
              {r.role}
            </div>
            {r.perms.map((p) => (
              <div
                key={p}
                style={{
                  color: "#777D86",
                  display: "flex",
                  gap: 5,
                  alignItems: "baseline",
                }}
              >
                <span style={{ color: "#04DC9A", flexShrink: 0 }}>·</span>
                {p}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function InviteAdminDialog({
  open,
  onOpenChange,
  onSubmitted,
  onError,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmitted: () => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("viewer");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail("");
    setRole("viewer");
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await createAdmin({ email: email.trim(), role });
      reset();
      onSubmitted();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent style={{ maxWidth: 420 }}>
        <DialogHeader>
          <DialogTitle>Invite admin user</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#777D86",
                display: "block",
                marginBottom: 5,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@airrun.app"
              style={{
                fontFamily: "inherit",
                fontSize: 13,
                border: "1px solid #EDF0F3",
                borderRadius: 8,
                padding: "8px 10px",
                width: "100%",
                color: "#24262B",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#777D86",
                display: "block",
                marginBottom: 5,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Role
            </label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as AdminRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer — read-only access</SelectItem>
                <SelectItem value="editor">
                  Editor — can edit parks &amp; reports
                </SelectItem>
                <SelectItem value="super_admin">
                  Super Admin — full access
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#777D86",
              padding: "8px 12px",
              background: "#F7F8FA",
              borderRadius: 8,
              border: "1px solid #EDF0F3",
              lineHeight: 1.5,
            }}
          >
            The invitee will receive a magic-link to set their password and
            land in the admin SPA.
          </div>
        </div>
        <DialogFooter>
          <Btn
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Btn>
          <Btn
            variant="brand"
            onClick={() => void handleSubmit()}
            disabled={submitting || email.trim().length === 0}
          >
            {IC.send} {submitting ? "Sending…" : "Send invite"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit tab
// ─────────────────────────────────────────────────────────────────────────────

const AUDIT_TYPE_COLORS: Record<string, { fg: string; bg: string }> = {
  park: { fg: "#13B981", bg: "#F0FDF8" },
  report: { fg: "#EF4B4B", bg: "#FFF1F1" },
  user: { fg: "#1888FF", bg: "#EBF3FF" },
  bug: { fg: "#F7B731", bg: "#FFFBEB" },
  feedback: { fg: "#7C3AED", bg: "#F5F3FF" },
  admin: { fg: "#1888FF", bg: "#EBF3FF" },
};

function AuditTab() {
  const { caller, isLoading: callerLoading } = useCallerRole();
  const enabled = caller?.isSuperAdmin === true;

  // Cursor-paginated state. cursor is the oldest id we've already
  // loaded; clicking "Load older" sets cursor and the next query
  // fetches rows below it, then we concatenate.
  const [pages, setPages] = useState<AuditRow[]>([]);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: firstPage, error: loadErr } = useQuery({
    queryKey: qk.audit(),
    queryFn: async () => {
      const page = await fetchAudit({});
      setPages(page.audit);
      setHasMore(page.has_more);
      if (page.audit.length > 0) {
        setCursor(page.audit[page.audit.length - 1].id);
      }
      return page;
    },
    enabled,
  });
  const rows = pages.length > 0 ? pages : firstPage?.audit ?? [];

  const loadOlder = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchAudit({ before_id: cursor });
      setPages((prev) => [...prev, ...next.audit]);
      setHasMore(next.has_more);
      if (next.audit.length > 0) {
        setCursor(next.audit[next.audit.length - 1].id);
      } else {
        setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const exportCsv = () => {
    const header = [
      "timestamp",
      "admin",
      "action",
      "target_type",
      "target_id",
      "target_label",
    ];
    const escape = (v: string) =>
      `"${v.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.created_at,
          r.admin_name ?? "(deleted)",
          r.action,
          r.target_type ?? "",
          r.target_id ?? "",
          r.target_label ?? "",
        ]
          .map(escape)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airrun-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (callerLoading) return <LoadingState />;
  if (!caller?.isSuperAdmin) {
    return (
      <EmptyState
        title="Super admin access required"
        desc="You don't have permission to view the audit log."
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "#24262B" }}>
          Audit Log
        </div>
        <Btn
          variant="secondary"
          size="sm"
          onClick={exportCsv}
          disabled={rows.length === 0}
        >
          {IC.download} Export CSV
        </Btn>
      </div>

      {loadErr ? (
        <div
          style={{
            padding: 16,
            color: "#EF4B4B",
            fontSize: 13,
            background: "#FFF1F1",
            borderRadius: 8,
          }}
          role="alert"
        >
          Failed to load: {loadErr.message}
        </div>
      ) : rows.length === 0 && !firstPage ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState title="No audit entries yet." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #EDF0F3" }}>
                {["Timestamp", "Admin", "Action", "Target", "Type"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        color: "#777D86",
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const typeColor = r.target_type
                  ? AUDIT_TYPE_COLORS[r.target_type] ?? {
                      fg: "#777D86",
                      bg: "#F3F4F6",
                    }
                  : null;
                return (
                  <tr
                    key={r.id}
                    style={{ borderBottom: "1px solid #EDF0F3" }}
                  >
                    <td
                      style={{
                        padding: "10px 12px",
                        color: "#777D86",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                        fontFamily: "monospace",
                      }}
                    >
                      {formatDateTime(r.created_at)}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        color: "#24262B",
                        fontWeight: 500,
                      }}
                    >
                      {r.admin_name ?? (
                        <span
                          style={{ color: "#B6C7D6", fontStyle: "italic" }}
                        >
                          (deleted)
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        color: "#24262B",
                      }}
                    >
                      {r.action}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        color: "#24262B",
                        fontSize: 12,
                      }}
                    >
                      {r.target_label ?? r.target_id ?? "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {r.target_type && typeColor ? (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 7px",
                            borderRadius: 4,
                            fontWeight: 600,
                            background: typeColor.bg,
                            color: typeColor.fg,
                          }}
                        >
                          {r.target_type}
                        </span>
                      ) : (
                        <span style={{ color: "#B6C7D6" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => void loadOlder()}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load older"}
          </Btn>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Decorative tabs (Data Sources + Notifications) — per master plan
// ─────────────────────────────────────────────────────────────────────────────

function DataSourcesTab() {
  const sources = [
    {
      name: "AirVisual API",
      status: "connected",
      parks: 6,
      lastSync: "2026-04-28 09:00",
      interval: "15 min",
    },
    {
      name: "IQAir Station (Lumpini)",
      status: "connected",
      parks: 1,
      lastSync: "2026-04-28 09:10",
      interval: "5 min",
    },
    {
      name: "Manual Entry",
      status: "active",
      parks: 2,
      lastSync: "2026-04-26 12:00",
      interval: "Manual",
    },
  ];

  return (
    <div>
      <DecorativeBanner />
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#24262B",
          marginBottom: 12,
        }}
      >
        AQI Data Sources
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sources.map((s) => (
          <div
            key={s.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              border: "1px solid #EDF0F3",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: s.status === "connected" ? "#13B981" : "#F7B731",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#24262B" }}>
                {s.name}
              </div>
              <div style={{ fontSize: 12, color: "#777D86" }}>
                {s.parks} park{s.parks !== 1 ? "s" : ""} · Refresh: {s.interval}{" "}
                · Last sync: {s.lastSync}
              </div>
            </div>
            <Btn variant="secondary" size="xs" disabled>
              {IC.edit} Configure
            </Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const items = [
    { label: "New high-severity report submitted", on: true },
    { label: "New bug reported by user", on: true },
    { label: "Park AQI exceeds Poor threshold", on: true },
    { label: "Daily digest of new feedback", on: false },
    { label: "Weekly summary report", on: true },
    { label: "Data source sync failure", on: true },
    { label: "New user registration spike (>10/day)", on: false },
  ];

  return (
    <div>
      <DecorativeBanner />
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#24262B",
          marginBottom: 12,
        }}
      >
        Admin Notifications
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {items.map((n, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: "1px solid #EDF0F3",
              opacity: 0.7,
            }}
          >
            <span style={{ fontSize: 13, color: "#24262B" }}>{n.label}</span>
            <div
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: n.on ? "#04DC9A" : "#EDF0F3",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: 2,
                  left: n.on ? 18 : 2,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecorativeBanner() {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: "10px 14px",
        background: "#FFFBEB",
        border: "1px solid #FDE68A",
        borderRadius: 8,
        fontSize: 12,
        color: "#92400E",
      }}
    >
      Coming soon — controls are read-only for now.
    </div>
  );
}
