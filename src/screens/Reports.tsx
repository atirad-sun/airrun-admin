// Port of airrun-design/project/admin-page-ops.jsx (ReportsPage section).
// Composition-only against the R1 primitive set; backend wired in D3 Phase A
// (admin-api reports/report/patch-report deployed and verified live).
// Closest analog is Bugs.tsx — list + detail drawer with a status state
// machine. Differences: report id is numeric, drawer renders the user's
// photo inline, drawer has a Resolution Notes textarea persisted on resolve.

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchReports,
  patchReport,
  type Report,
  type ReportListRow,
  type ReportSeverity,
  type ReportStatus,
} from "@/lib/adminApi";
import { qk } from "@/lib/queries";
import { useCallerRole } from "@/lib/useCallerRole";
import { CAT_LABELS } from "@/lib/cfg";
import BulkBar from "@/components/BulkBar";
import Btn from "@/components/Btn";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";
import Card from "@/components/Card";
import Chip from "@/components/Chip";
import DataTable, { type Column } from "@/components/DataTable";
import DetailDrawer from "@/components/DetailDrawer";
import DetailRow from "@/components/DetailRow";
import EmptyState from "@/components/EmptyState";
import FilterBar from "@/components/FilterBar";
import LoadingState from "@/components/LoadingState";
import PageHeader from "@/components/PageHeader";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import SearchInput from "@/components/SearchInput";
import SevChip from "@/components/SevChip";
import { IC } from "@/components/icons";

const STATUS_OPTIONS: ReportStatus[] = [
  "new",
  "reviewing",
  "resolved",
  "dismissed",
];
const SEVERITY_OPTIONS: ReportSeverity[] = ["low", "medium", "high"];

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

export default function Reports() {
  const queryClient = useQueryClient();
  const { caller } = useCallerRole();
  const canWrite = caller?.canWrite ?? false;
  const { data: rows, error: loadErrorObj } = useQuery({
    queryKey: qk.reports(),
    queryFn: () => fetchReports().then((r) => r.reports),
  });
  const loadError = loadErrorObj ? loadErrorObj.message : null;

  const invalidateList = useCallback(
    () => queryClient.invalidateQueries({ queryKey: qk.reports() }),
    [queryClient]
  );

  // Filters — all client-side. Server caps at 200 rows; combining
  // search across park_name + message + user_name means we filter
  // post-fetch anyway (mirror of Bugs.tsx).
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] =
    useState<"all" | ReportStatus>("all");
  const [filterSev, setFilterSev] =
    useState<"all" | ReportSeverity>("all");
  const [selected, setSelected] = useState<number[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerReport, setDrawerReport] = useState<Report | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterSev !== "all" && r.severity !== filterSev) return false;
      if (q) {
        const hay = [
          r.park_name ?? "",
          r.user_name ?? "",
          r.message ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filterStatus, filterSev]);

  const openDetail = useCallback((row: ReportListRow) => {
    setActionError(null);
    setDrawerReport(row);
    setDrawerOpen(true);
  }, []);

  // Single mutation handler — covers status changes, severity, and
  // resolution-text persistence. Drawer composes the patch object.
  const handlePatch = useCallback(
    async (id: number, patch: Parameters<typeof patchReport>[1]) => {
      setActionError(null);
      try {
        const { report } = await patchReport(id, patch);
        setDrawerReport(report);
        invalidateList();
      } catch (err) {
        setActionError((err as Error).message);
      }
    },
    [invalidateList]
  );

  // Page-header subline counts.
  const newCount = rows?.filter((r) => r.status === "new").length ?? 0;
  const reviewingCount =
    rows?.filter((r) => r.status === "reviewing").length ?? 0;

  const cols: Column<ReportListRow>[] = [
    {
      key: "id",
      label: "ID",
      render: (v) => (
        <span
          style={{ fontSize: 11, color: "#B6C7D6", fontFamily: "monospace" }}
        >
          R{String(v).padStart(4, "0")}
        </span>
      ),
    },
    {
      key: "park_name",
      label: "Park",
      sortable: true,
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 500, color: "#24262B", fontSize: 13 }}>
            {(v as string | null) ?? row.park_id}
          </div>
          <div style={{ fontSize: 11, color: "#777D86" }}>
            {row.category ? CAT_LABELS[row.category] ?? row.category : "—"}
          </div>
        </div>
      ),
    },
    {
      key: "user_name",
      label: "Reporter",
      sortable: true,
      render: (v) => (
        <span style={{ fontSize: 13, color: "#24262B" }}>
          {(v as string | null) ?? "—"}
        </span>
      ),
    },
    {
      key: "severity",
      label: "Severity",
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
      key: "created_at",
      label: "Submitted",
      sortable: true,
      render: (v) => (
        <span
          style={{ fontSize: 12, color: "#777D86", whiteSpace: "nowrap" }}
        >
          {formatShortDate(v as string)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Park Reports"
        sub={
          rows ? `${newCount} new · ${reviewingCount} reviewing` : undefined
        }
      />

      {!canWrite && <ReadOnlyBanner what="report triage" />}

      <Card>
        <div
          style={{ padding: "14px 16px", borderBottom: "1px solid #EDF0F3" }}
        >
          <FilterBar>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search reports…"
              width={240}
            />
            <Select
              value={filterStatus}
              onValueChange={(v) =>
                setFilterStatus(v as "all" | ReportStatus)
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterSev}
              onValueChange={(v) =>
                setFilterSev(v as "all" | ReportSeverity)
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
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
            actions={[
              <Btn key="resolve" variant="secondary" size="xs" disabled>
                {IC.check} Mark resolved
              </Btn>,
              <Btn key="dismiss" variant="ghost" size="xs" disabled>
                {IC.x} Dismiss
              </Btn>,
            ]}
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
          <EmptyState title="No reports match the current filters." />
        ) : (
          <DataTable<ReportListRow>
            cols={cols}
            rows={filtered}
            onRow={openDetail}
            selectedIds={selected}
            onSelect={(ids) => setSelected(ids as number[])}
            emptyMsg="No reports match the current filters."
          />
        )}
      </Card>

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) {
            setDrawerReport(null);
            setActionError(null);
          }
        }}
        title={
          drawerReport
            ? `Report R${String(drawerReport.id).padStart(4, "0")}`
            : "Report"
        }
        width={520}
      >
        {!drawerReport ? (
          <LoadingState />
        ) : (
          <ReportDetailView
            report={drawerReport}
            canWrite={canWrite}
            actionError={actionError}
            onPatch={handlePatch}
          />
        )}
      </DetailDrawer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail drawer body
// ─────────────────────────────────────────────────────────────────────────────

function ReportDetailView({
  report,
  canWrite,
  actionError,
  onPatch,
}: {
  report: Report;
  canWrite: boolean;
  actionError: string | null;
  onPatch: (
    id: number,
    patch: Parameters<typeof patchReport>[1]
  ) => Promise<void>;
}) {
  const [resolution, setResolution] = useState(report.resolution ?? "");
  const [savingStatus, setSavingStatus] = useState<ReportStatus | null>(null);

  const handleStatusChange = async (next: ReportStatus) => {
    setSavingStatus(next);
    try {
      const patch: Parameters<typeof patchReport>[1] = { status: next };
      // When resolving, persist the resolution-notes textarea contents
      // alongside the status change so the row reflects "resolved with
      // notes" in a single round-trip.
      if (next === "resolved") {
        patch.resolution = resolution.trim() === "" ? null : resolution;
      }
      await onPatch(report.id, patch);
    } finally {
      setSavingStatus(null);
    }
  };

  // Inline onError fallback flag — same pattern as Users.tsx UserAvatar.
  // No useEffect/probe; the <img> tag itself signals failure, and React
  // re-renders the drawer with PhotoPlaceholder.
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <div>
      {/* Two-tile status + severity header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            background: "#F7F8FA",
            borderRadius: 8,
            border: "1px solid #EDF0F3",
          }}
        >
          <div style={{ fontSize: 11, color: "#777D86", marginBottom: 4 }}>
            Status
          </div>
          <Chip status={report.status} />
        </div>
        <div
          style={{
            padding: "10px 14px",
            background: "#F7F8FA",
            borderRadius: 8,
            border: "1px solid #EDF0F3",
          }}
        >
          <div style={{ fontSize: 11, color: "#777D86", marginBottom: 4 }}>
            Severity
          </div>
          <SevChip sev={report.severity} />
        </div>
      </div>

      {/* Detail rows */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          marginBottom: 20,
        }}
      >
        <DetailRow
          label="Park"
          value={report.park_name ?? report.park_id}
        />
        <DetailRow
          label="Category"
          value={
            report.category
              ? CAT_LABELS[report.category] ?? report.category
              : "—"
          }
        />
        <DetailRow label="Reporter" value={report.user_name ?? "—"} />
        <DetailRow
          label="Submitted"
          value={new Date(report.created_at).toLocaleString()}
        />
        <DetailRow label="Assignee" value="—" />
        <DetailRow label="Weather" value={report.weather ?? "—"} />
        <DetailRow label="Air Quality" value={report.air_quality ?? "—"} />
        <DetailRow label="Crowd" value={report.crowd ?? "—"} />
      </div>

      {/* User message */}
      <Section label="User Message">
        <div
          style={{
            padding: "12px 14px",
            background: "#F7F8FA",
            borderRadius: 8,
            border: "1px solid #EDF0F3",
            fontSize: 13,
            color: "#24262B",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {report.message || (
            <span style={{ color: "#B6C7D6", fontStyle: "italic" }}>
              No message attached.
            </span>
          )}
        </div>
      </Section>

      {/* Attachment */}
      <Section label="Attachment">
        {report.photo_url && !photoFailed ? (
          <a
            href={report.photo_url}
            target="_blank"
            rel="noreferrer"
            style={{ display: "block", borderRadius: 8, overflow: "hidden" }}
          >
            <img
              src={report.photo_url}
              alt="Report attachment"
              referrerPolicy="no-referrer"
              onError={() => setPhotoFailed(true)}
              style={{
                width: "100%",
                maxHeight: 240,
                objectFit: "cover",
                display: "block",
                borderRadius: 8,
                border: "1px solid #EDF0F3",
              }}
            />
          </a>
        ) : (
          <PhotoPlaceholder height={100} />
        )}
      </Section>

      {/* Resolution notes */}
      <Section label="Resolution Notes">
        <textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          rows={3}
          placeholder="Describe what action was taken…"
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
          }}
        />
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

      {/* Action buttons — state-machine driven; writers only. */}
      {canWrite && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {report.status !== "reviewing" && (
            <Btn
              variant="secondary"
              size="sm"
              onClick={() => void handleStatusChange("reviewing")}
              disabled={savingStatus !== null}
            >
              {IC.eye} Mark Reviewing
            </Btn>
          )}
          {report.status !== "resolved" && (
            <Btn
              variant="brand"
              size="sm"
              onClick={() => void handleStatusChange("resolved")}
              disabled={savingStatus !== null}
            >
              {IC.check} Resolve
            </Btn>
          )}
          {report.status !== "dismissed" && (
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => void handleStatusChange("dismissed")}
              disabled={savingStatus !== null}
            >
              {IC.x} Dismiss
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
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

