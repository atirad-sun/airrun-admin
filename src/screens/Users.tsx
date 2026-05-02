// Port of airrun-design/project/admin-page-users.jsx.  Composition-only
// against the R1 primitive set; backend wired in D2 Phase A (PR #35,
// admin-api users/user/patch-user-notes already deployed and verified
// live).  Same shape as Parks.tsx — list + detail drawer with tabs.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchUser,
  fetchUsers,
  patchUser,
  type User,
  type UserListRow,
  type UserPatch,
  type UserStatus,
} from "@/lib/adminApi";
import { qk } from "@/lib/queries";
import { useCallerRole } from "@/lib/useCallerRole";
import { CAT_LABELS } from "@/lib/cfg";
import AqiChip from "@/components/AqiChip";
import BulkBar from "@/components/BulkBar";
import Btn from "@/components/Btn";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";
import Card from "@/components/Card";
import Chip from "@/components/Chip";
import ConfirmModal from "@/components/ConfirmModal";
import DataTable, { type Column } from "@/components/DataTable";
import DetailDrawer from "@/components/DetailDrawer";
import DetailRow from "@/components/DetailRow";
import EmptyState from "@/components/EmptyState";
import FilterBar from "@/components/FilterBar";
import LoadingState from "@/components/LoadingState";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import SevChip from "@/components/SevChip";
import Tabs from "@/components/Tabs";
import Timeline, { type TimelineItem } from "@/components/Timeline";
import { IC } from "@/components/icons";

// 7-band aqi_status from parks_with_aqi → 3-band the AqiChip cfg uses.
// Same collapse rule as Overview / Parks.  Unknown buckets to poor.
function aqi3(status: string): "good" | "moderate" | "poor" {
  if (status === "Good") return "good";
  if (status === "Moderate") return "moderate";
  return "poor";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
    return `Today ${d.toTimeString().slice(0, 5)}`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

// Avatar with LINE picture_url fallback to initials.  Two sizes used:
// 30px in the table row, 44px in the drawer header.  Falls back on
// load error (LINE profile URLs occasionally rotate/404).
//
// CSP note: admin/vercel.json img-src must allowlist
// https://profile.line-scdn.net for production rendering.  Without
// the allowlist the browser silently blocks the image and the
// onError fallback to initials kicks in — graceful degradation, but
// the picture won't appear in prod until the CSP includes it.
function UserAvatar({
  name,
  pictureUrl,
  size,
}: {
  name: string;
  pictureUrl: string | null;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = pictureUrl && !failed;
  const fontSize = Math.max(11, Math.round(size * 0.36));
  const borderWidth = size >= 40 ? 2 : 1;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#F0FDF8",
        border: `${borderWidth}px solid #A7F3D0`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {showImage ? (
        <img
          src={pictureUrl}
          alt={name}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <span
          style={{ fontSize, fontWeight: 700, color: "#04A074" }}
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}

type StatusFilter = "all" | UserStatus;
type DrawerTab = "profile" | "activity" | "parks" | "reports";

interface ConfirmState {
  user: UserListRow | User;
  next: UserStatus;
}

export default function Users() {
  const queryClient = useQueryClient();
  const { caller } = useCallerRole();
  const canWrite = caller?.canWrite ?? false;
  const {
    data: rows,
    error: loadErrorObj,
  } = useQuery({
    queryKey: qk.users(),
    queryFn: () => fetchUsers().then((r) => r.users),
  });
  const loadError = loadErrorObj ? loadErrorObj.message : null;

  const invalidateList = useCallback(
    () => queryClient.invalidateQueries({ queryKey: qk.users() }),
    [queryClient]
  );

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<string[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState<User | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("profile");

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((u) => {
      if (filterStatus !== "all" && u.status !== filterStatus) return false;
      if (
        q &&
        !u.display_name.toLowerCase().includes(q) &&
        !u.id.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, search, filterStatus]);

  const openDetail = useCallback(async (row: UserListRow) => {
    setDrawerOpen(true);
    setDrawerUser(null);
    setDrawerLoading(true);
    setDrawerError(null);
    setDrawerTab("profile");
    setActionError(null);
    try {
      const { user } = await fetchUser(row.id);
      if (!user) {
        setDrawerError("User not found");
      } else {
        setDrawerUser(user);
      }
    } catch (err) {
      setDrawerError((err as Error).message);
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const handlePatch = useCallback(
    async (userId: string, patch: UserPatch) => {
      setActionError(null);
      try {
        const { user } = await patchUser(userId, patch);
        // patch-user-notes returns the list-row shape (counts = null).
        // Merge it into the current drawer user so we keep the hydrated
        // saved_parks/reports/feedback arrays without a re-fetch.
        setDrawerUser((prev) =>
          prev && prev.id === userId
            ? {
                ...prev,
                status: user.status,
                admin_notes: user.admin_notes,
                updated_at: user.updated_at,
              }
            : prev
        );
        invalidateList();
      } catch (err) {
        setActionError((err as Error).message);
      }
    },
    [invalidateList]
  );

  const totalCount = rows?.length ?? 0;

  const cols: Column<UserListRow>[] = [
    {
      key: "display_name",
      label: "User",
      sortable: true,
      render: (v, row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <UserAvatar
            name={v as string}
            pictureUrl={row.picture_url}
            size={30}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 500, color: "#24262B" }}>
              {v as string}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#B6C7D6",
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 180,
              }}
              title={row.id}
            >
              {row.id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Joined",
      sortable: true,
      render: (v) => (
        <span style={{ fontSize: 12, color: "#777D86" }}>
          {formatDate(v as string)}
        </span>
      ),
    },
    {
      key: "updated_at",
      label: "Last Active",
      sortable: true,
      render: (v) => (
        <span style={{ fontSize: 12, color: "#777D86" }}>
          {formatRelative(v as string)}
        </span>
      ),
    },
    {
      key: "saved_parks_count",
      label: "Saved",
      sortable: true,
      render: (v) => {
        const n = (v as number) ?? 0;
        return <span style={{ fontSize: 13, color: "#24262B" }}>{n}</span>;
      },
    },
    {
      key: "reports_count",
      label: "Reports",
      sortable: true,
      render: (v) => {
        const n = (v as number) ?? 0;
        return (
          <span
            style={{
              fontSize: 13,
              color: n > 0 ? "#24262B" : "#B6C7D6",
              fontWeight: n > 2 ? 600 : 400,
            }}
          >
            {n}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (v) => <Chip status={v as string} />,
    },
    {
      key: "id",
      label: "",
      render: (_v, row) => (
        <div
          style={{ display: "flex", gap: 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Btn variant="ghost" size="xs" onClick={() => void openDetail(row)}>
            {IC.eye}
          </Btn>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        sub={rows ? `${totalCount} registered users` : undefined}
      />

      {!canWrite && <ReadOnlyBanner what="user notes and status edits" />}

      <Card>
        <div
          style={{ padding: "14px 16px", borderBottom: "1px solid #EDF0F3" }}
        >
          <FilterBar>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name or LINE ID…"
              width={260}
            />
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as StatusFilter)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <span
              style={{ marginLeft: "auto", fontSize: 12, color: "#777D86" }}
            >
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </FilterBar>
          <BulkBar
            count={selected.length}
            onClear={() => setSelected([])}
            actions={
              <Btn
                variant="danger"
                size="xs"
                disabled
                title="Bulk endpoint not built yet"
              >
                {IC.alertCircle} Suspend
              </Btn>
            }
          />
        </div>

        {loadError ? (
          <div
            style={{
              padding: 16,
              color: "#EF4B4B",
              fontSize: 13,
              background: "#FFF1F1",
              borderTop: "1px solid #FECACA",
            }}
            role="alert"
          >
            Failed to load: {loadError}
          </div>
        ) : !rows ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState title="No users match the current filters." />
        ) : (
          <DataTable<UserListRow>
            cols={cols}
            rows={filtered}
            onRow={(row) => void openDetail(row)}
            selectedIds={selected}
            onSelect={(ids) => setSelected(ids as string[])}
            emptyMsg="No users match the current filters."
          />
        )}
      </Card>

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) {
            setDrawerUser(null);
            setDrawerError(null);
            setActionError(null);
          }
        }}
        title={drawerUser ? drawerUser.display_name : "User Detail"}
        width={520}
      >
        {drawerLoading ? (
          <LoadingState />
        ) : drawerError ? (
          <div
            style={{
              padding: 12,
              color: "#EF4B4B",
              fontSize: 13,
              background: "#FFF1F1",
              borderRadius: 8,
              border: "1px solid #FECACA",
            }}
            role="alert"
          >
            {drawerError}
          </div>
        ) : !drawerUser ? null : (
          <UserDrawerContent
            user={drawerUser}
            tab={drawerTab}
            canWrite={canWrite}
            onTabChange={setDrawerTab}
            onSaveNotes={(notes) =>
              handlePatch(drawerUser.id, { admin_notes: notes })
            }
            onRequestSuspend={() =>
              setConfirm({ user: drawerUser, next: "suspended" })
            }
            onRequestReinstate={() =>
              setConfirm({ user: drawerUser, next: "active" })
            }
            actionError={actionError}
          />
        )}
      </DetailDrawer>

      <ConfirmModal
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        onConfirm={() => {
          if (confirm) {
            void handlePatch(confirm.user.id, { status: confirm.next });
          }
        }}
        title={confirm?.next === "suspended" ? "Suspend User" : "Reinstate User"}
        message={
          confirm
            ? confirm.next === "suspended"
              ? `Mark "${confirm.user.display_name}" as suspended? This is a flag for now — LIFF doesn't enforce it yet.`
              : `Restore "${confirm.user.display_name}" to active status?`
            : ""
        }
        confirmLabel={
          confirm?.next === "suspended" ? "Suspend" : "Reinstate"
        }
        danger={confirm?.next === "suspended"}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer content
// ─────────────────────────────────────────────────────────────────────────────

function UserDrawerContent({
  user,
  tab,
  canWrite,
  onTabChange,
  onSaveNotes,
  onRequestSuspend,
  onRequestReinstate,
  actionError,
}: {
  user: User;
  tab: DrawerTab;
  canWrite: boolean;
  onTabChange: (t: DrawerTab) => void;
  onSaveNotes: (notes: string | null) => Promise<void>;
  onRequestSuspend: () => void;
  onRequestReinstate: () => void;
  actionError: string | null;
}) {
  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "activity", label: "Activity" },
    {
      id: "parks",
      label: "Saved Parks",
      count: user.saved_parks.length,
    },
    {
      id: "reports",
      label: "Reports",
      count: user.reports.length,
    },
  ];

  return (
    <div>
      {/* Profile header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 20,
          padding: "14px 16px",
          background: "#F7F8FA",
          borderRadius: 8,
          border: "1px solid #EDF0F3",
        }}
      >
        <UserAvatar
          name={user.display_name}
          pictureUrl={user.picture_url}
          size={44}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#24262B",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.display_name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#B6C7D6",
              fontFamily: "monospace",
              marginTop: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={user.id}
          >
            {user.id}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <Chip status={user.status} />
          {canWrite &&
            (user.status === "suspended" ? (
              <Btn
                variant="secondary"
                size="xs"
                onClick={onRequestReinstate}
              >
                {IC.check} Reinstate
              </Btn>
            ) : (
              <Btn variant="danger" size="xs" onClick={onRequestSuspend}>
                {IC.alertCircle} Suspend
              </Btn>
            ))}
        </div>
      </div>

      <Tabs
        tabs={tabs}
        active={tab}
        onChange={(id) => onTabChange(id as DrawerTab)}
      />

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

      {tab === "profile" && (
        <ProfileTab user={user} canWrite={canWrite} onSaveNotes={onSaveNotes} />
      )}
      {tab === "activity" && <ActivityTab user={user} />}
      {tab === "parks" && <ParksTab user={user} />}
      {tab === "reports" && <ReportsTab user={user} />}
    </div>
  );
}

function ProfileTab({
  user,
  canWrite,
  onSaveNotes,
}: {
  user: User;
  canWrite: boolean;
  onSaveNotes: (notes: string | null) => Promise<void>;
}) {
  const [notes, setNotes] = useState(user.admin_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Reset draft when switching between users.
  useEffect(() => {
    setNotes(user.admin_notes ?? "");
    setSavedAt(null);
  }, [user.id, user.admin_notes]);

  const dirty = notes !== (user.admin_notes ?? "");

  const save = async () => {
    setSaving(true);
    try {
      await onSaveNotes(notes.trim() === "" ? null : notes);
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          marginBottom: 20,
        }}
      >
        <DetailRow label="User ID" value={user.id} mono />
        <DetailRow label="LINE ID" value={user.id} mono />
        <DetailRow label="Joined" value={formatDate(user.created_at)} />
        <DetailRow
          label="Last Active"
          value={formatRelative(user.updated_at)}
        />
        <DetailRow label="Reports Submitted" value={user.reports.length} />
        <DetailRow label="Feedback Items" value={user.feedback.length} />
        <DetailRow label="Saved Parks" value={user.saved_parks.length} />
        <DetailRow label="Status" value={<Chip status={user.status} />} />
        {user.run_time && <DetailRow label="Run Time" value={user.run_time} />}
        <DetailRow
          label="Notifications"
          value={user.notify_enabled ? `On at ${user.notify_time ?? "—"}` : "Off"}
        />
      </div>

      {/* Privacy notice */}
      <div
        style={{
          background: "#FFFBEB",
          border: "1px solid #FDE68A",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#92400E",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 4,
          }}
        >
          Privacy Notice
        </div>
        <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.55 }}>
          LINE user IDs are masked in exports. Admin access to user data is
          logged for audit purposes.
        </div>
      </div>

      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#777D86",
            display: "block",
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Admin Note
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={
            canWrite
              ? "Internal notes (not visible to user)…"
              : "Internal notes (read-only for viewer role)"
          }
          maxLength={4000}
          readOnly={!canWrite}
          style={{
            fontFamily: "inherit",
            fontSize: 13,
            border: "1px solid #EDF0F3",
            borderRadius: 8,
            padding: "8px 10px",
            width: "100%",
            resize: "vertical",
            color: "#24262B",
            outline: "none",
            lineHeight: 1.55,
            boxSizing: "border-box",
            background: canWrite ? "#fff" : "#F7F8FA",
          }}
        />
        {canWrite && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 11, color: "#B6C7D6" }}>
              {savedAt && !dirty
                ? `Saved at ${savedAt}`
                : dirty
                  ? "Unsaved changes"
                  : ""}
            </span>
            <Btn
              variant="secondary"
              size="xs"
              onClick={() => void save()}
              disabled={saving || !dirty}
            >
              {IC.send} {saving ? "Saving…" : "Save note"}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// Synthesized timeline from saved_parks + reports + feedback.  Real
// per-user audit history doesn't exist yet; this gives admins a
// chronological view of what the user has done in-app.
function ActivityTab({ user }: { user: User }) {
  type Item = TimelineItem & { date: number };

  const items: Item[] = [];
  for (const f of user.saved_parks) {
    items.push({
      text: `Saved ${f.name}`,
      time: formatRelative(f.saved_at),
      icon: IC.parks,
      date: new Date(f.saved_at).getTime(),
    });
  }
  for (const r of user.reports) {
    items.push({
      text: `Submitted report on ${r.park_id}`,
      time: formatRelative(r.created_at),
      icon: IC.reports,
      date: new Date(r.created_at).getTime(),
    });
  }
  for (const f of user.feedback) {
    items.push({
      text: `Submitted ${f.category} feedback (★${f.rating})`,
      time: formatRelative(f.created_at),
      icon: IC.feedback,
      date: new Date(f.created_at).getTime(),
    });
  }
  items.push({
    text: "Account created",
    time: formatDate(user.created_at),
    icon: IC.user,
    bold: true,
    date: new Date(user.created_at).getTime(),
  });

  items.sort((a, b) => b.date - a.date);

  if (items.length === 1) {
    // Only the synthetic "Account created" event — show empty-ish state.
    return (
      <EmptyState
        title="No activity yet"
        desc="This user hasn't saved parks, submitted reports, or sent feedback."
      />
    );
  }

  return <Timeline items={items} />;
}

function ParksTab({ user }: { user: User }) {
  if (user.saved_parks.length === 0) {
    return (
      <EmptyState
        title="No saved parks"
        desc="This user hasn't saved any parks yet."
      />
    );
  }
  return (
    <div>
      {user.saved_parks.map((p) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            border: "1px solid #EDF0F3",
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#24262B",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {p.name}
            </div>
            <div style={{ fontSize: 11, color: "#777D86" }}>
              {p.district ?? "—"}
            </div>
          </div>
          <AqiChip value={p.aqi} status={aqi3(p.aqi_status)} />
        </div>
      ))}
    </div>
  );
}

function ReportsTab({ user }: { user: User }) {
  if (user.reports.length === 0) {
    return (
      <EmptyState
        title="No reports"
        desc="This user has not submitted any park reports."
      />
    );
  }
  return (
    <div>
      {user.reports.map((r) => {
        const summary = [r.weather, r.air_quality, r.crowd]
          .filter(Boolean)
          .join(" / ");
        return (
          <div
            key={r.id}
            style={{
              padding: 12,
              border: "1px solid #EDF0F3",
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <Chip status={r.status} />
              <SevChip sev={r.severity} />
              <span
                style={{
                  fontSize: 11,
                  color: "#777D86",
                  marginLeft: "auto",
                }}
              >
                {formatRelative(r.created_at)}
              </span>
            </div>
            <div
              style={{ fontSize: 12, color: "#777D86", marginBottom: 4 }}
            >
              {(r.category && CAT_LABELS[r.category]) || r.category || "Report"}
              {" · "}
              <strong style={{ color: "#24262B" }}>{r.park_id}</strong>
            </div>
            {summary && (
              <div
                style={{ fontSize: 13, color: "#24262B", lineHeight: 1.5 }}
              >
                {summary}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
