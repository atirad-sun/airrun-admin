import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import {
  fetchBug,
  fetchBugs,
  createBug,
  patchBug,
  type Bug,
  type BugListRow,
  type BugSeverity,
  type BugStatus,
  type BugFilters,
  type CreateBugInput,
  type BugPatch,
} from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DataTable, { type Column } from "@/components/DataTable";
import DetailDrawer from "@/components/DetailDrawer";
import { cn } from "@/lib/utils";

const SEVERITY_OPTIONS: BugSeverity[] = ["low", "medium", "high", "critical"];
const STATUS_OPTIONS: BugStatus[] = [
  "open",
  "triaged",
  "in_progress",
  "fixed",
  "closed",
];

const SEVERITY_STYLE: Record<BugSeverity, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_STYLE: Record<BugStatus, string> = {
  open: "bg-blue-100 text-blue-800",
  triaged: "bg-purple-100 text-purple-800",
  in_progress: "bg-amber-100 text-amber-800",
  fixed: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-100 text-slate-600",
};

function formatRelative(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function Bugs() {
  const [rows, setRows] = useState<BugListRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BugFilters>({});
  const [selected, setSelected] = useState<Bug | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    setLoadError(null);
    fetchBugs(filters)
      .then((res) => setRows(res.bugs))
      .catch((err: Error) => setLoadError(err.message));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = useCallback(async (row: BugListRow) => {
    setDrawerOpen(true);
    setSelected(null);
    try {
      const { bug } = await fetchBug(row.id);
      setSelected(bug);
    } catch (err) {
      setSelected({ ...row, description: `Failed to load: ${(err as Error).message}`, steps: null, device: null, logs: null, reporter_user_id: null } as Bug);
    }
  }, []);

  const handleCreate = useCallback(
    async (input: CreateBugInput) => {
      const { bug } = await createBug(input);
      setCreateOpen(false);
      load();
      // Open the freshly created bug in the drawer
      setSelected(bug);
      setDrawerOpen(true);
    },
    [load]
  );

  const handlePatch = useCallback(
    async (id: string, patch: BugPatch) => {
      const { bug } = await patchBug(id, patch);
      setSelected(bug);
      load();
    },
    [load]
  );

  const columns: Column<BugListRow>[] = [
    {
      key: "id",
      header: "ID",
      cell: (r) => <span className="font-mono text-xs">{r.id}</span>,
      className: "whitespace-nowrap",
    },
    {
      key: "severity",
      header: "Severity",
      cell: (r) => (
        <span
          className={cn(
            "inline-block rounded px-2 py-0.5 text-xs font-medium",
            SEVERITY_STYLE[r.severity]
          )}
        >
          {r.severity}
        </span>
      ),
      className: "whitespace-nowrap",
    },
    {
      key: "title",
      header: "Title",
      fill: true,
      cell: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      key: "area",
      header: "Area",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">{r.area}</span>
      ),
      className: "whitespace-nowrap",
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <span
          className={cn(
            "inline-block rounded px-2 py-0.5 text-xs font-medium",
            STATUS_STYLE[r.status]
          )}
        >
          {r.status}
        </span>
      ),
      className: "whitespace-nowrap",
    },
    {
      key: "owner",
      header: "Owner",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">{r.owner ?? "—"}</span>
      ),
      className: "whitespace-nowrap",
    },
    {
      key: "created",
      header: "Created",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatRelative(r.created_at)}
        </span>
      ),
      className: "whitespace-nowrap text-right",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bugs</h1>
          <p className="text-sm text-muted-foreground">
            {rows ? `${rows.length} ${rows.length === 1 ? "row" : "rows"}` : "—"}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New bug
            </Button>
          </DialogTrigger>
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={(filters.status as string) ?? "all"}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              status: v === "all" ? undefined : (v as BugStatus),
            }))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.severity ?? "all"}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              severity: v === "all" ? undefined : (v as BugSeverity),
            }))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {SEVERITY_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          className="w-56"
          placeholder="Filter by area (exact)"
          value={filters.area ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              area: e.target.value || undefined,
            }))
          }
        />
      </div>

      {loadError && (
        <p className="text-sm text-destructive">Failed to load: {loadError}</p>
      )}

      <DataTable<BugListRow>
        columns={columns}
        rows={rows ?? []}
        rowKey={(r) => r.id}
        onRowClick={openDetail}
        loading={!rows && !loadError}
        emptyMessage="No bugs match these filters."
      />

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setSelected(null);
        }}
        title={selected ? `${selected.id} — ${selected.title}` : "Bug"}
        description={selected ? `Created ${formatRelative(selected.created_at)} ago` : undefined}
      >
        {selected ? (
          <BugDetail bug={selected} onPatch={handlePatch} />
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </DetailDrawer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create form
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

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium">Title</label>
        <Input
          required
          autoFocus
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="One-line summary"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Area</label>
          <Input
            required
            maxLength={64}
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="liff / admin / fetch-aqi …"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Severity</label>
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
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">Description (optional)</label>
        <textarea
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-md border bg-transparent p-2 text-sm"
          placeholder="What's broken? Reproduction steps go in the detail drawer after creation."
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail / edit
// ─────────────────────────────────────────────────────────────────────────────

function BugDetail({
  bug,
  onPatch,
}: {
  bug: Bug;
  onPatch: (id: string, patch: BugPatch) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BugPatch>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft({
      title: bug.title,
      description: bug.description,
      steps: bug.steps,
      device: bug.device,
      logs: bug.logs,
      severity: bug.severity,
      area: bug.area,
      status: bug.status,
      owner: bug.owner,
      reporter_name: bug.reporter_name,
    });
    setEditing(true);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Diff against current bug — only send fields that changed.
      const patch: BugPatch = {};
      for (const [k, v] of Object.entries(draft)) {
        const key = k as keyof BugPatch;
        if (v !== bug[key]) {
          (patch as Record<string, unknown>)[key] = v ?? null;
        }
      }
      if (Object.keys(patch).length === 0) {
        setEditing(false);
        return;
      }
      await onPatch(bug.id, patch);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(next: BugStatus) {
    setError(null);
    try {
      await onPatch(bug.id, { status: next });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-4 pt-4">
        <div className="flex flex-wrap gap-2">
          <Badge className={SEVERITY_STYLE[bug.severity]} variant="secondary">
            {bug.severity}
          </Badge>
          <Badge className={STATUS_STYLE[bug.status]} variant="secondary">
            {bug.status}
          </Badge>
          <Badge variant="secondary">{bug.area}</Badge>
        </div>

        <Field label="Description" value={bug.description} />
        <Field label="Steps to reproduce" value={bug.steps} />
        <Field label="Device" value={bug.device} />
        <Field label="Logs" value={bug.logs} mono />
        <Field label="Owner" value={bug.owner} />
        <Field label="Reporter" value={bug.reporter_name} />

        <div className="space-y-2 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground">
            Quick status change
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.filter((s) => s !== bug.status).map((s) => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                onClick={() => quickStatus(s)}
              >
                → {s}
              </Button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={startEdit}>Edit</Button>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-3 pt-4">
      <EditField
        label="Title"
        value={draft.title ?? ""}
        onChange={(v) => setDraft({ ...draft, title: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Severity</label>
          <Select
            value={draft.severity}
            onValueChange={(v) =>
              setDraft({ ...draft, severity: v as BugSeverity })
            }
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
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Status</label>
          <Select
            value={draft.status}
            onValueChange={(v) => setDraft({ ...draft, status: v as BugStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <EditField
        label="Area"
        value={draft.area ?? ""}
        onChange={(v) => setDraft({ ...draft, area: v })}
      />
      <EditField
        label="Owner"
        value={draft.owner ?? ""}
        onChange={(v) => setDraft({ ...draft, owner: v || null })}
      />
      <EditField
        label="Reporter name"
        value={draft.reporter_name ?? ""}
        onChange={(v) => setDraft({ ...draft, reporter_name: v || null })}
      />
      <EditTextarea
        label="Description"
        value={draft.description ?? ""}
        onChange={(v) => setDraft({ ...draft, description: v || null })}
      />
      <EditTextarea
        label="Steps to reproduce"
        value={draft.steps ?? ""}
        onChange={(v) => setDraft({ ...draft, steps: v || null })}
      />
      <EditField
        label="Device"
        value={draft.device ?? ""}
        onChange={(v) => setDraft({ ...draft, device: v || null })}
      />
      <EditTextarea
        label="Logs"
        value={draft.logs ?? ""}
        onChange={(v) => setDraft({ ...draft, logs: v || null })}
        mono
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 whitespace-pre-wrap text-sm",
          !value && "text-muted-foreground italic",
          mono && "font-mono text-xs"
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function EditTextarea({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={cn(
          "w-full rounded-md border bg-transparent p-2 text-sm",
          mono && "font-mono text-xs"
        )}
      />
    </div>
  );
}
