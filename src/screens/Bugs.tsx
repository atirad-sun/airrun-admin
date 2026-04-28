// Port of airrun-design/project/admin-page-ops.jsx (BugsPage section).
// Composition-only against the R1 primitive set.  Backend is the same
// as the Phase B/C wiring — admin-api-{read,write} bug actions unchanged.
//
// Comments (Add Comment / Post comment from the design) are intentionally
// out of scope per the R3 plan: no bug_comments table or admin-api action
// exists for them yet, and building that is deferred to a later phase.

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  fetchBug,
  fetchBugs,
  createBug,
  patchBug,
  type Bug,
  type BugListRow,
  type BugSeverity,
  type BugStatus,
  type CreateBugInput,
} from "@/lib/adminApi";
import Btn from "@/components/Btn";
import Card from "@/components/Card";
import Chip from "@/components/Chip";
import DataTable, { type Column } from "@/components/DataTable";
import DetailDrawer from "@/components/DetailDrawer";
import DetailRow from "@/components/DetailRow";
import EmptyState from "@/components/EmptyState";
import FilterBar from "@/components/FilterBar";
import LoadingState from "@/components/LoadingState";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import SevChip from "@/components/SevChip";
import { IC } from "@/components/icons";

const SEVERITY_OPTIONS: BugSeverity[] = ["low", "medium", "high", "critical"];
const STATUS_OPTIONS: BugStatus[] = [
  "open",
  "triaged",
  "in_progress",
  "fixed",
  "closed",
];

// Status state machine for the detail drawer's "Move to next" button.
// Closed terminates — no auto-progression past fixed; user explicitly hits
// Close to mark closed.
const NEXT_STATUS: Partial<Record<BugStatus, BugStatus>> = {
  open: "triaged",
  triaged: "in_progress",
  in_progress: "fixed",
};

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  if (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
    return d.toTimeString().slice(0, 5);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusLabel(s: BugStatus): string {
  return s.replace("_", " ");
}

export default function Bugs() {
  const [rows, setRows] = useState<BugListRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters — all client-side. The API supports filtering on status/severity/
  // area, but combining substring search across title+area means we filter
  // post-fetch anyway. bugs is hard-capped at 200 server-side so this is fine.
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | BugStatus>("all");
  const [filterSev, setFilterSev] = useState<"all" | BugSeverity>("all");

  const [selected, setSelected] = useState<Bug | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setLoadError(null);
    // Pull all bugs; filtering is client-side so the API call stays cacheable.
    fetchBugs({})
      .then((res) => setRows(res.bugs))
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((b) => {
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      if (filterSev !== "all" && b.severity !== filterSev) return false;
      if (q && !b.title.toLowerCase().includes(q) && !b.area.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [rows, search, filterStatus, filterSev]);

  const openDetail = useCallback(async (row: BugListRow) => {
    setActionError(null);
    setDrawerOpen(true);
    setSelected(null);
    try {
      const { bug } = await fetchBug(row.id);
      setSelected(bug);
    } catch (err) {
      setSelected({
        ...row,
        description: `Failed to load: ${(err as Error).message}`,
        steps: null,
        device: null,
        logs: null,
        reporter_user_id: null,
      });
    }
  }, []);

  const handleStatus = useCallback(
    async (id: string, next: BugStatus) => {
      setActionError(null);
      try {
        const { bug } = await patchBug(id, { status: next });
        setSelected(bug);
        load();
      } catch (err) {
        setActionError((err as Error).message);
      }
    },
    [load]
  );

  const handleCreate = useCallback(
    async (input: CreateBugInput) => {
      const { bug } = await createBug(input);
      setCreateOpen(false);
      load();
      setSelected(bug);
      setDrawerOpen(true);
    },
    [load]
  );

  // Counts for the page header sub-line.
  const openCount = rows?.filter((b) => b.status === "open").length ?? 0;
  const inProgressCount = rows?.filter((b) => b.status === "in_progress").length ?? 0;

  const cols: Column<BugListRow>[] = [
    {
      key: "id",
      label: "ID",
      render: (v) => (
        <span style={{ fontSize: 11, color: "#B6C7D6", fontFamily: "monospace" }}>
          {v as string}
        </span>
      ),
    },
    {
      key: "title",
      label: "Title",
      sortable: true,
      maxWidth: 260,
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 500, color: "#24262B", fontSize: 13 }}>
            {v as string}
          </div>
          <div style={{ fontSize: 11, color: "#777D86" }}>{row.area}</div>
        </div>
      ),
    },
    {
      key: "severity",
      label: "Sev",
      sortable: true,
      render: (v) => <SevChip sev={v as string} />,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (v) => <Chip status={v as string} />,
    },
    {
      key: "reporter_name",
      label: "Reporter",
      render: (v) => (
        <span style={{ fontSize: 12, color: "#777D86" }}>{(v as string) ?? "—"}</span>
      ),
    },
    {
      key: "owner",
      label: "Owner",
      render: (v) => (
        <span style={{ fontSize: 12, color: "#24262B" }}>{(v as string) ?? "—"}</span>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (v) => (
        <span style={{ fontSize: 12, color: "#777D86" }}>
          {formatShortDate(v as string)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bug Tracker"
        sub={
          rows
            ? `${openCount} open · ${inProgressCount} in progress`
            : undefined
        }
        actions={
          <Btn variant="brand" size="sm" onClick={() => setCreateOpen(true)}>
            {IC.plus} File Bug
          </Btn>
        }
      />

      <Card>
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #EDF0F3",
          }}
        >
          <FilterBar>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search bugs…"
              width={240}
            />
            <Select
              value={filterStatus}
              onValueChange={(v) =>
                setFilterStatus(v as "all" | BugStatus)
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterSev}
              onValueChange={(v) =>
                setFilterSev(v as "all" | BugSeverity)
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                color: "#777D86",
              }}
            >
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </FilterBar>
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
          <EmptyState title="No bugs match the current filters." />
        ) : (
          <DataTable<BugListRow>
            cols={cols}
            rows={filtered}
            onRow={openDetail}
            emptyMsg="No bugs match the current filters."
          />
        )}
      </Card>

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) {
            setSelected(null);
            setActionError(null);
          }
        }}
        title={selected ? `${selected.id} — ${selected.title}` : "Bug"}
        width={560}
      >
        {!selected ? (
          <LoadingState />
        ) : (
          <BugDetailView
            bug={selected}
            actionError={actionError}
            onStatus={handleStatus}
          />
        )}
      </DetailDrawer>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create bug</DialogTitle>
            <DialogDescription>
              ID is generated automatically (BUG-001, BUG-002, …).
            </DialogDescription>
          </DialogHeader>
          <CreateBugForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail drawer body
// ─────────────────────────────────────────────────────────────────────────────

function BugDetailView({
  bug,
  actionError,
  onStatus,
}: {
  bug: Bug;
  actionError: string | null;
  onStatus: (id: string, next: BugStatus) => Promise<void>;
}) {
  const next = NEXT_STATUS[bug.status];

  return (
    <div>
      {/* Chip strip */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <SevChip sev={bug.severity} />
        <Chip status={bug.status} />
        <span
          style={{
            fontSize: 12,
            color: "#777D86",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {IC.clock} {formatShortDate(bug.created_at)}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#24262B",
            marginLeft: "auto",
            fontWeight: 500,
          }}
        >
          Owner: {bug.owner ?? "—"}
        </span>
      </div>

      {/* DetailRow list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          marginBottom: 20,
        }}
      >
        <DetailRow label="Affected Area" value={bug.area} />
        <DetailRow label="Reporter" value={bug.reporter_name ?? "—"} />
        <DetailRow label="Device / Context" value={bug.device ?? "—"} />
      </div>

      {/* Description */}
      <Section label="Description">
        <div
          style={{
            fontSize: 13,
            color: "#24262B",
            lineHeight: 1.6,
            padding: "10px 14px",
            background: "#F7F8FA",
            borderRadius: 8,
            border: "1px solid #EDF0F3",
            whiteSpace: "pre-wrap",
          }}
        >
          {bug.description || (
            <span style={{ color: "#B6C7D6", fontStyle: "italic" }}>
              No description provided.
            </span>
          )}
        </div>
      </Section>

      {/* Steps to reproduce — only render when present */}
      {bug.steps && (
        <Section label="Steps to Reproduce">
          <pre
            style={{
              margin: 0,
              fontSize: 12,
              color: "#24262B",
              lineHeight: 1.6,
              padding: "10px 14px",
              background: "#F7F8FA",
              borderRadius: 8,
              border: "1px solid #EDF0F3",
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
            }}
          >
            {bug.steps}
          </pre>
        </Section>
      )}

      {/* Logs — always render, even when empty (matches design) */}
      <Section label="Logs">
        <div
          style={{
            padding: "10px 14px",
            background: "#17202A",
            borderRadius: 8,
            minHeight: 60,
            fontSize: 12,
            color: "#A7F3D0",
            fontFamily: "monospace",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {bug.logs || <span style={{ color: "#555B63" }}># No logs attached</span>}
        </div>
      </Section>

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

      {/* Action buttons (status state machine) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {next && (
          <Btn
            variant="brand"
            size="sm"
            onClick={() => onStatus(bug.id, next)}
          >
            {IC.arrowUp} Move to {statusLabel(next)}
          </Btn>
        )}
        {bug.status !== "closed" && (
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => onStatus(bug.id, "closed")}
          >
            {IC.x} Close
          </Btn>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#777D86",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create bug form (kept from prior implementation; design doesn't rework this)
// ─────────────────────────────────────────────────────────────────────────────

function CreateBugForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: CreateBugInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("medium");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        area: area.trim(),
        severity,
        description: description.trim() || undefined,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: 13,
    border: "1px solid #EDF0F3",
    borderRadius: 8,
    padding: "6px 10px",
    outline: "none",
    background: "#fff",
    color: "#24262B",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="Title">
        <input
          required
          autoFocus
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="One-line summary"
          style={inputStyle}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Area">
          <input
            required
            maxLength={64}
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="liff / admin / fetch-aqi …"
            style={inputStyle}
          />
        </Field>
        <Field label="Severity">
          <Select
            value={severity}
            onValueChange={(v) => setSeverity(v as BugSeverity)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Description (optional)">
        <textarea
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="What's broken?  Reproduction steps go in the detail drawer after creation."
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
        />
      </Field>
      {error && (
        <p style={{ fontSize: 13, color: "#EF4B4B", margin: 0 }} role="alert">
          {error}
        </p>
      )}
      <DialogFooter>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn variant="primary" type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create"}
        </Btn>
      </DialogFooter>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#777D86",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
