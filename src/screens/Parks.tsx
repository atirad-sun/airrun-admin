// Port of airrun-design/project/admin-page-parks.jsx.
// Composition-only against the R1 primitive set.  Backend wired in D1 Phase A
// (admin-api-{read,write} parks/park/park-reports/patch-park/toggle-park-visibility).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  createPark,
  fetchAqiStations,
  fetchParks,
  fetchPark,
  fetchParkReports,
  patchPark,
  togglePark,
  type AqiStation,
  type Park,
  type ParkListRow,
  type ParkPatch,
  type ParkReportRow,
} from "@/lib/adminApi";
import { qk } from "@/lib/queries";
import { useCallerRole } from "@/lib/useCallerRole";
import { CAT_LABELS } from "@/lib/cfg";
import AqiChip from "@/components/AqiChip";
import MapPicker from "@/components/MapPicker";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";
import BulkBar from "@/components/BulkBar";
import Btn from "@/components/Btn";
import Card from "@/components/Card";
import Chip from "@/components/Chip";
import ConfirmModal from "@/components/ConfirmModal";
import DataTable, { type Column } from "@/components/DataTable";
import DetailDrawer from "@/components/DetailDrawer";
import DetailRow from "@/components/DetailRow";
import EmptyState from "@/components/EmptyState";
import FilterBar from "@/components/FilterBar";
import LoadingState from "@/components/LoadingState";
import MapPlaceholder from "@/components/MapPlaceholder";
import PageHeader from "@/components/PageHeader";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import SearchInput from "@/components/SearchInput";
import SevChip from "@/components/SevChip";
import Tabs from "@/components/Tabs";
import { IC } from "@/components/icons";

// Thai PCD aqi_status (VeryGood|Good|Moderate|Sensitive|Unhealthy) → 3-band
// chip UI. VeryGood collapses to good; Sensitive/Unhealthy collapse to poor.
function aqi3(status: string): "good" | "moderate" | "poor" {
  if (status === "VeryGood" || status === "Good") return "good";
  if (status === "Moderate") return "moderate";
  return "poor";
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) return d.toTimeString().slice(0, 5);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type AqiFilter = "all" | "good" | "moderate" | "poor";
type VisibilityFilter = "all" | "visible" | "hidden";
type VerifiedFilter = "all" | "verified" | "unverified";
type DrawerTab = "info" | "edit" | "reports" | "history";

interface ConfirmState {
  park: ParkListRow;
  visible: boolean; // target state
}

export default function Parks() {
  const queryClient = useQueryClient();
  const { caller } = useCallerRole();
  const canWrite = caller?.canWrite ?? false;
  const {
    data: rows,
    error: loadErrorObj,
  } = useQuery({
    queryKey: qk.parks(),
    queryFn: () => fetchParks().then((r) => r.parks),
  });
  const loadError = loadErrorObj ? loadErrorObj.message : null;

  // Mutations invalidate the list query — react-query refetches in the
  // background while the cached rows continue rendering.  No manual
  // setRows(null) flash on edit.
  const invalidateList = useCallback(
    () => queryClient.invalidateQueries({ queryKey: qk.parks() }),
    [queryClient]
  );

  // Filters — all client-side.  44 parks today; way under any threshold
  // where server-side filtering would matter.
  const [search, setSearch] = useState("");
  const [filterAqi, setFilterAqi] = useState<AqiFilter>("all");
  const [filterVisible, setFilterVisible] = useState<VisibilityFilter>("all");
  const [filterVerified, setFilterVerified] = useState<VerifiedFilter>("all");

  const [selected, setSelected] = useState<string[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPark, setDrawerPark] = useState<Park | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("info");

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !(p.district ?? "").toLowerCase().includes(q)
      )
        return false;
      if (filterAqi !== "all" && aqi3(p.aqi_status) !== filterAqi) return false;
      if (filterVisible === "visible" && !p.visible) return false;
      if (filterVisible === "hidden" && p.visible) return false;
      if (filterVerified === "verified" && !p.verified) return false;
      if (filterVerified === "unverified" && p.verified) return false;
      return true;
    });
  }, [rows, search, filterAqi, filterVisible, filterVerified]);

  const openDetail = useCallback(
    async (row: ParkListRow, tab: DrawerTab = "info") => {
      setDrawerOpen(true);
      setDrawerPark(null);
      setDrawerLoading(true);
      setDrawerError(null);
      setDrawerTab(tab);
      setActionError(null);
      try {
        const { park } = await fetchPark(row.id);
        if (!park) {
          setDrawerError("Park not found");
        } else {
          setDrawerPark(park);
        }
      } catch (err) {
        setDrawerError((err as Error).message);
      } finally {
        setDrawerLoading(false);
      }
    },
    []
  );

  const handleToggleVisibility = useCallback(
    async (parkId: string, visible: boolean) => {
      setActionError(null);
      try {
        const { park } = await togglePark(parkId, visible);
        setDrawerPark(park);
        invalidateList();
      } catch (err) {
        setActionError((err as Error).message);
      }
    },
    [invalidateList]
  );

  const handlePatch = useCallback(
    async (parkId: string, patch: ParkPatch) => {
      setActionError(null);
      try {
        const { park } = await patchPark(parkId, patch);
        setDrawerPark(park);
        invalidateList();
      } catch (err) {
        setActionError((err as Error).message);
      }
    },
    [invalidateList]
  );

  // Counts for the page-header subline.  Use rows (all data) not filtered.
  const totalCount = rows?.length ?? 0;
  const visibleCount = rows?.filter((p) => p.visible).length ?? 0;

  const cols: Column<ParkListRow>[] = [
    {
      key: "name",
      label: "Park",
      sortable: true,
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 500, color: "#24262B" }}>{v as string}</div>
          <div style={{ fontSize: 11, color: "#777D86" }}>
            {row.district ?? "—"}
          </div>
        </div>
      ),
    },
    {
      key: "aqi",
      label: "AQI / Status",
      sortable: true,
      render: (v, row) => {
        const distKm = row.station_distance_km as number | null;
        const source = row.aqi_source as string | null;
        const tooltipParts: string[] = [];
        if (distKm != null) tooltipParts.push(`${distKm} km from station`);
        if (source)         tooltipParts.push(`source: ${source}`);
        const tooltip = tooltipParts.join(" · ") || undefined;
        return (
          <span title={tooltip} style={{ cursor: tooltip ? "help" : "default" }}>
            <AqiChip value={v as number} status={aqi3(row.aqi_status)} />
          </span>
        );
      },
    },
    {
      key: "visible",
      label: "Visibility",
      sortable: true,
      render: (v) => (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: v ? "#13B981" : "#777D86",
            background: v ? "#F0FDF8" : "#F3F4F6",
            padding: "2px 8px",
            borderRadius: 4,
          }}
        >
          {v ? "Visible" : "Hidden"}
        </span>
      ),
    },
    {
      key: "verified",
      label: "Verified",
      sortable: true,
      render: (v) =>
        v ? (
          <span
            style={{
              color: "#13B981",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
            }}
          >
            {IC.check} Verified
          </span>
        ) : (
          <span style={{ color: "#B6C7D6", fontSize: 12 }}>—</span>
        ),
    },
    {
      key: "aqi_updated_at",
      label: "Last Updated",
      sortable: true,
      render: (v) => (
        <span style={{ fontSize: 12, color: "#777D86", whiteSpace: "nowrap" }}>
          {formatRelativeDate(v as string | null)}
        </span>
      ),
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
              color: n > 0 ? "#EF4B4B" : "#B6C7D6",
              fontWeight: n > 0 ? 600 : 400,
            }}
          >
            {n}
          </span>
        );
      },
    },
    {
      key: "id",
      label: "",
      render: (_v, row) => (
        <div
          style={{ display: "flex", gap: 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Btn
            variant="ghost"
            size="xs"
            onClick={() => void openDetail(row, "info")}
          >
            {IC.eye}
          </Btn>
          {canWrite && (
            <>
              <Btn
                variant="ghost"
                size="xs"
                onClick={() => void openDetail(row, "edit")}
              >
                {IC.edit}
              </Btn>
              <Btn
                variant="ghost"
                size="xs"
                style={{ color: row.visible ? "#F7B731" : "#13B981" }}
                onClick={() =>
                  setConfirm({ park: row, visible: !row.visible })
                }
              >
                {row.visible ? IC.eyeOff : IC.eye}
              </Btn>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Parks"
        sub={
          rows ? `${totalCount} parks total · ${visibleCount} visible` : undefined
        }
        actions={
          canWrite ? (
            <Btn
              variant="brand"
              size="sm"
              onClick={() => {
                setActionError(null);
                setAddOpen(true);
              }}
            >
              {IC.plus} Add Park
            </Btn>
          ) : null
        }
      />

      {!canWrite && <ReadOnlyBanner what="park editing" />}

      <Card>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #EDF0F3" }}>
          <FilterBar>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search parks…"
              width={240}
            />
            <Select
              value={filterAqi}
              onValueChange={(v) => setFilterAqi(v as AqiFilter)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="AQI" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All AQI</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterVisible}
              onValueChange={(v) => setFilterVisible(v as VisibilityFilter)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All visibility</SelectItem>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterVerified}
              onValueChange={(v) => setFilterVerified(v as VerifiedFilter)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Verified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All data</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
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
              // Bulk endpoints aren't built yet; show buttons for visual fidelity
              // but disable them so accidental clicks don't seem broken.
              <>
                <Btn variant="secondary" size="xs" disabled title="Bulk endpoint not built yet">
                  {IC.eyeOff} Hide selected
                </Btn>
                <Btn variant="secondary" size="xs" disabled title="Bulk endpoint not built yet">
                  {IC.check} Mark verified
                </Btn>
              </>
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
          <EmptyState title="No parks match the current filters." />
        ) : (
          <DataTable<ParkListRow>
            cols={cols}
            rows={filtered}
            onRow={(row) => void openDetail(row, "info")}
            selectedIds={selected}
            onSelect={(ids) => setSelected(ids as string[])}
            emptyMsg="No parks match the current filters."
          />
        )}
      </Card>

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) {
            setDrawerPark(null);
            setDrawerError(null);
            setActionError(null);
          }
        }}
        title={drawerPark ? drawerPark.name : "Park Detail"}
        width={560}
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
        ) : !drawerPark ? null : (
          <ParkDrawerContent
            park={drawerPark}
            tab={drawerTab}
            onTabChange={setDrawerTab}
            onToggleVisibility={(visible) =>
              handleToggleVisibility(drawerPark.id, visible)
            }
            onPatch={(patch) => handlePatch(drawerPark.id, patch)}
            actionError={actionError}
          />
        )}
      </DetailDrawer>

      <ConfirmModal
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        onConfirm={() => {
          if (confirm) {
            void handleToggleVisibility(confirm.park.id, confirm.visible);
          }
        }}
        title={confirm?.visible ? "Show Park" : "Hide Park"}
        message={
          confirm
            ? confirm.visible
              ? `Make "${confirm.park.name}" visible to users in the LIFF app?`
              : `Hide "${confirm.park.name}" from the LIFF app? Users will no longer see it.`
            : ""
        }
        confirmLabel={confirm?.visible ? "Show Park" : "Hide Park"}
        danger={confirm ? !confirm.visible : true}
      />

      <AddParkDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(park) => {
          // Refresh the list so the new row appears, and open the Edit
          // drawer so ops can fill in the optional fields (track length,
          // hours, station distance, photo) without an extra click.
          invalidateList();
          // openDetail only reads `id` from the row; cast is safe.
          void openDetail({ id: park.id } as ParkListRow, "edit");
        }}
        onError={setActionError}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Park dialog (V1)
//
// Minimal-fields creation: name + district + lat + lng + station_name.
// Track length, hours, photo, etc. stay deferred to the Edit drawer so
// the form-to-save loop is fast (PRD success metric: time-to-create
// <90s p50).  Server forces the new park invisible+unverified so it
// doesn't pollute LIFF until ops opens the Edit drawer and flips the
// flags.
// ─────────────────────────────────────────────────────────────────────────────

// Sentinel value for the station Select — lives outside the
// 15-station list so we can distinguish "ops hasn't picked one,
// let the server choose nearest" from a real station id.
const AUTO_STATION = "__auto__";

// Haversine in km, matching the server-side helper in
// admin-api-write.  Used here only to surface the auto-suggested
// station in the Select while the user is still on the dialog —
// the server re-computes it independently on submit.
function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestStation(
  pin: { lat: number; lng: number },
  stations: AqiStation[]
): AqiStation | null {
  if (stations.length === 0) return null;
  let best = stations[0];
  let bestDist = haversineKm(pin.lat, pin.lng, best.lat, best.lng);
  for (let i = 1; i < stations.length; i++) {
    const d = haversineKm(pin.lat, pin.lng, stations[i].lat, stations[i].lng);
    if (d < bestDist) {
      best = stations[i];
      bestDist = d;
    }
  }
  return best;
}

function AddParkDialog({
  open,
  onOpenChange,
  onCreated,
  onError,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (park: Park) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  // Select value: AUTO_STATION until ops overrides.  When AUTO and
  // a pin is set, the dropdown label shows "Auto: <nearest name>".
  const [stationChoice, setStationChoice] = useState<string>(AUTO_STATION);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Cache the station list across dialog opens — it's small (15 rows)
  // and rarely changes.  staleTime: Infinity means we fetch once per
  // session.
  const { data: stationsData } = useQuery({
    queryKey: qk.aqiStations(),
    queryFn: () => fetchAqiStations().then((r) => r.stations),
    staleTime: Infinity,
  });
  const stations = stationsData ?? [];

  // What the auto-suggest label should say in the Select trigger.
  const autoSuggestion =
    pin && stations.length > 0 ? nearestStation(pin, stations) : null;

  const reset = () => {
    setName("");
    setDistrict("");
    setPin(null);
    setStationChoice(AUTO_STATION);
    setSubmitting(false);
    setLocalError(null);
  };

  const handleSubmit = async () => {
    setLocalError(null);
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setLocalError("Park name is required.");
      return;
    }
    if (!pin) {
      setLocalError("Pick a location on the map.");
      return;
    }
    setSubmitting(true);
    try {
      const { park } = await createPark({
        name: trimmedName,
        district: district.trim() === "" ? null : district.trim(),
        lat: pin.lat,
        lng: pin.lng,
        // AUTO_STATION → null on the wire so the server picks
        // nearest itself (so we don't desync from the server's
        // computation).  Real station id passes through.
        station_id: stationChoice === AUTO_STATION ? null : stationChoice,
      });
      reset();
      onOpenChange(false);
      onCreated(park);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: 13,
    border: "1px solid #EDF0F3",
    borderRadius: 8,
    padding: "8px 10px",
    width: "100%",
    color: "#24262B",
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#777D86",
    display: "block",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent style={{ maxWidth: 520 }}>
        <DialogHeader>
          <DialogTitle>Add Park</DialogTitle>
          <DialogDescription>
            Pin a location on the map and pick an AQI station. Other
            details can be filled in via the Edit drawer after saving.
          </DialogDescription>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Park name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="สวนลุมพินี"
              autoFocus
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>District</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Pathumwan"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Location * — click map to drop pin</label>
            <MapPicker value={pin} onChange={setPin} />
            <div
              style={{
                fontSize: 11,
                color: "#777D86",
                marginTop: 6,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              {pin
                ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
                : "No location picked yet"}
            </div>
          </div>
          <div>
            <label style={labelStyle}>AQI station</label>
            <Select value={stationChoice} onValueChange={setStationChoice}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO_STATION}>
                  {autoSuggestion
                    ? `Auto-suggest (nearest: ${autoSuggestion.name})`
                    : "Auto-suggest (nearest from pin)"}
                </SelectItem>
                {stations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.name_th ? ` — ${s.name_th}` : ""}
                  </SelectItem>
                ))}
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
            New parks land hidden and unverified. After saving you'll be
            taken to the Edit drawer to fill in track length, hours, and
            photo, then flip Visible to publish to LIFF.
          </div>
          {localError && (
            <div
              role="alert"
              style={{
                fontSize: 12,
                color: "#EF4B4B",
                background: "#FFF1F1",
                padding: "8px 12px",
                borderRadius: 8,
              }}
            >
              {localError}
            </div>
          )}
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
            disabled={submitting || name.trim().length === 0 || !pin}
          >
            {IC.plus} {submitting ? "Saving…" : "Add Park"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer content
// ─────────────────────────────────────────────────────────────────────────────

function ParkDrawerContent({
  park,
  tab,
  onTabChange,
  onToggleVisibility,
  onPatch,
  actionError,
}: {
  park: Park;
  tab: DrawerTab;
  onTabChange: (t: DrawerTab) => void;
  onToggleVisibility: (visible: boolean) => Promise<void>;
  onPatch: (patch: ParkPatch) => Promise<void>;
  actionError: string | null;
}) {
  // Reports tab: lazy-load on first activation.  Cached for the lifetime of
  // the drawer (drawer close clears it via parent state reset).
  const [reports, setReports] = useState<ParkReportRow[] | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "reports" || reports !== null) return;
    setReportsLoading(true);
    setReportsError(null);
    fetchParkReports(park.id)
      .then((res) => setReports(res.reports))
      .catch((err: Error) => setReportsError(err.message))
      .finally(() => setReportsLoading(false));
  }, [tab, park.id, reports]);

  const tabs = [
    { id: "info", label: "Info" },
    { id: "edit", label: "Edit" },
    { id: "reports", label: "Reports", count: park && reports ? reports.length : undefined },
    { id: "history", label: "History" },
  ];

  return (
    <div>
      {/* Header summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          padding: "12px 16px",
          background: "#F7F8FA",
          borderRadius: 8,
          border: "1px solid #EDF0F3",
        }}
      >
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
            {park.name}
          </div>
          <div style={{ fontSize: 12, color: "#777D86", marginTop: 2 }}>
            {park.district ?? "—"}
          </div>
        </div>
        <span
          title={[
            park.station_distance_km != null ? `${park.station_distance_km} km from station` : null,
            park.aqi_source ? `source: ${park.aqi_source}` : null,
          ].filter(Boolean).join(" · ") || undefined}
          style={{ cursor: "help" }}
        >
          <AqiChip value={park.aqi} status={aqi3(park.aqi_status)} />
        </span>
        <Btn
          variant={park.visible ? "secondary" : "primary"}
          size="xs"
          onClick={() => void onToggleVisibility(!park.visible)}
        >
          {park.visible ? (
            <>
              {IC.eyeOff} Hide
            </>
          ) : (
            <>
              {IC.eye} Show
            </>
          )}
        </Btn>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={(id) => onTabChange(id as DrawerTab)} />

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

      {tab === "info" && <InfoTab park={park} />}
      {tab === "edit" && <EditTab park={park} onPatch={onPatch} />}
      {tab === "reports" && (
        <ReportsTab
          reports={reports}
          loading={reportsLoading}
          error={reportsError}
        />
      )}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}

function InfoTab({ park }: { park: Park }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <MapPlaceholder height={160} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <DetailRow label="Park ID" value={park.id} mono />
        <DetailRow label="District" value={park.district ?? "—"} />
        <DetailRow
          label="Coordinates"
          value={`${park.lat}, ${park.lng}`}
          mono
        />
        {park.track_length_km != null && (
          <DetailRow label="Route Length" value={`${park.track_length_km} km`} />
        )}
        <DetailRow
          label="Opening Hours"
          value={
            park.open_time && park.close_time
              ? `${park.open_time} – ${park.close_time}`
              : "—"
          }
        />
        <DetailRow label="AQI Source" value={park.station_name ?? "—"} />
        <DetailRow
          label="Last Updated"
          value={park.aqi_updated_at ? new Date(park.aqi_updated_at).toLocaleString() : "—"}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#777D86",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 10,
          }}
        >
          Photos
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <PhotoPlaceholder height={100} />
          <PhotoPlaceholder height={100} />
        </div>
      </div>
    </div>
  );
}

function EditTab({
  park,
  onPatch,
}: {
  park: Park;
  onPatch: (patch: ParkPatch) => Promise<void>;
}) {
  const [name, setName] = useState(park.name);
  const [district, setDistrict] = useState(park.district ?? "");
  const [stationName, setStationName] = useState(park.station_name ?? "");
  const [lat, setLat] = useState(String(park.lat));
  const [lng, setLng] = useState(String(park.lng));
  const [trackKm, setTrackKm] = useState(
    park.track_length_km != null ? String(park.track_length_km) : ""
  );
  const [openTime, setOpenTime] = useState(park.open_time ?? "");
  const [closeTime, setCloseTime] = useState(park.close_time ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reset = () => {
    setName(park.name);
    setDistrict(park.district ?? "");
    setStationName(park.station_name ?? "");
    setLat(String(park.lat));
    setLng(String(park.lng));
    setTrackKm(park.track_length_km != null ? String(park.track_length_km) : "");
    setOpenTime(park.open_time ?? "");
    setCloseTime(park.close_time ?? "");
    setSaveError(null);
  };

  const save = async () => {
    setSaveError(null);
    const patch: ParkPatch = {};

    if (name !== park.name) patch.name = name;
    if (district !== (park.district ?? "")) patch.district = district || null;
    if (stationName !== (park.station_name ?? ""))
      patch.station_name = stationName || null;

    const latNum = Number(lat);
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      setSaveError("Latitude must be between -90 and 90.");
      return;
    }
    if (latNum !== park.lat) patch.lat = latNum;

    const lngNum = Number(lng);
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      setSaveError("Longitude must be between -180 and 180.");
      return;
    }
    if (lngNum !== park.lng) patch.lng = lngNum;

    if (trackKm.trim() === "") {
      if (park.track_length_km != null) patch.track_length_km = null;
    } else {
      const tk = Number(trackKm);
      if (!Number.isFinite(tk) || tk < 0) {
        setSaveError("Route length must be a non-negative number.");
        return;
      }
      if (tk !== park.track_length_km) patch.track_length_km = tk;
    }

    if (openTime !== (park.open_time ?? "")) patch.open_time = openTime || null;
    if (closeTime !== (park.close_time ?? ""))
      patch.close_time = closeTime || null;

    if (Object.keys(patch).length === 0) {
      setSaveError("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      await onPatch(patch);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <FormField label="Park Name">
        <TextInput value={name} onChange={setName} />
      </FormField>
      <FormField label="District">
        <TextInput value={district} onChange={setDistrict} />
      </FormField>
      <FormField label="AQI Source / Station">
        <TextInput value={stationName} onChange={setStationName} />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Latitude">
          <TextInput value={lat} onChange={setLat} />
        </FormField>
        <FormField label="Longitude">
          <TextInput value={lng} onChange={setLng} />
        </FormField>
      </div>
      <FormField label="Route Length (km)">
        <TextInput value={trackKm} onChange={setTrackKm} />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Open Time">
          <TextInput value={openTime} onChange={setOpenTime} />
        </FormField>
        <FormField label="Close Time">
          <TextInput value={closeTime} onChange={setCloseTime} />
        </FormField>
      </div>

      {saveError && (
        <div
          style={{
            fontSize: 12,
            color: "#EF4B4B",
            background: "#FFF1F1",
            padding: "8px 12px",
            borderRadius: 8,
          }}
          role="alert"
        >
          {saveError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          paddingTop: 4,
        }}
      >
        <Btn variant="secondary" onClick={reset} disabled={saving}>
          Discard
        </Btn>
        <Btn variant="brand" onClick={save} disabled={saving}>
          {IC.check} {saving ? "Saving…" : "Save Changes"}
        </Btn>
      </div>
    </div>
  );
}

function ReportsTab({
  reports,
  loading,
  error,
}: {
  reports: ParkReportRow[] | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <LoadingState />;
  if (error) {
    return (
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
        Failed to load reports: {error}
      </div>
    );
  }
  if (!reports || reports.length === 0) {
    return (
      <EmptyState
        title="No reports"
        desc="No user reports have been submitted for this park."
      />
    );
  }
  return (
    <div>
      {reports.map((r) => (
        <div
          key={r.id}
          style={{
            padding: "12px",
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
              style={{ fontSize: 12, color: "#777D86", marginLeft: "auto" }}
            >
              {new Date(r.created_at).toLocaleString()}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#777D86", marginBottom: 4 }}>
            {(r.category && CAT_LABELS[r.category]) || r.category || "Report"}
            {r.user_name && <> · {r.user_name}</>}
          </div>
          {r.message && (
            <div style={{ fontSize: 13, color: "#24262B", lineHeight: 1.5 }}>
              {r.message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HistoryTab() {
  // Per-park audit history is its own follow-up — D5 surfaces global audit
  // log; per-park filtering belongs there.  Stub for v1.
  return (
    <EmptyState
      title="No history yet"
      desc="Admin actions on this park will appear here."
    />
  );
}

// Small form helpers — kept inline so the file stays self-contained.

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#777D86",
          display: "block",
          marginBottom: 5,
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

function TextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
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
      }}
    />
  );
}
