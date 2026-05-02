// Port of airrun-design/project/admin-page-ops.jsx (FeedbackPage section).
// Two-column layout (1fr 380px) — sticky detail panel on the right
// instead of a DetailDrawer. Different shape from Bugs/Reports/Users/Parks.
//
// Backend wired in D4 Phase A (PR #38, admin-api feedback /
// feedback_item / patch-feedback deployed and verified live).
//
// Locked decision per the d4-feedback plan: option (c). LIFF stays on
// the 3-bucket `category` (bug|feature|general) for user-facing UX;
// admin re-tags into `category_admin` (5-value triage taxonomy).
// Both columns coexist on the row.

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
  fetchFeedback,
  patchFeedback,
  type Feedback,
  type FeedbackCategoryAdmin,
  type FeedbackCategoryUser,
  type FeedbackListRow,
  type FeedbackSentiment,
  type FeedbackStatus,
} from "@/lib/adminApi";
import { qk } from "@/lib/queries";
import { CAT_LABELS } from "@/lib/cfg";
import Btn from "@/components/Btn";
import Card from "@/components/Card";
import Chip from "@/components/Chip";
import DetailRow from "@/components/DetailRow";
import EmptyState from "@/components/EmptyState";
import FilterBar from "@/components/FilterBar";
import LoadingState from "@/components/LoadingState";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import { IC } from "@/components/icons";

const STATUS_OPTIONS: FeedbackStatus[] = [
  "new",
  "tagged",
  "responded",
  "archived",
];
const ADMIN_CATEGORY_OPTIONS: FeedbackCategoryAdmin[] = [
  "feature_request",
  "complaint",
  "praise",
  "usability",
  "data_quality",
];
const SENTIMENT_OPTIONS: FeedbackSentiment[] = [
  "positive",
  "negative",
  "neutral",
];

// LIFF-side category labels (matches the user-facing Thai dropdown
// concepts but rendered in English for the admin SPA).  Used for the
// "User submitted as" hint in the detail panel.
const USER_CATEGORY_LABELS: Record<FeedbackCategoryUser, string> = {
  bug: "Bug report",
  feature: "Feature request",
  general: "General feedback",
};

// Sentiment glyph + color map — design uses up/down/dash arrows.
const SENTIMENT_GLYPH: Record<FeedbackSentiment, string> = {
  positive: "↑",
  negative: "↓",
  neutral: "—",
};
const SENTIMENT_COLOR: Record<FeedbackSentiment, string> = {
  positive: "#13B981",
  negative: "#EF4B4B",
  neutral: "#777D86",
};

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function Feedback() {
  const queryClient = useQueryClient();
  const { data: rows, error: loadErrorObj } = useQuery({
    queryKey: qk.feedback(),
    queryFn: () => fetchFeedback().then((r) => r.feedback),
  });
  const loadError = loadErrorObj ? loadErrorObj.message : null;

  const invalidateList = useCallback(
    () => queryClient.invalidateQueries({ queryKey: qk.feedback() }),
    [queryClient]
  );

  // Filters — all client-side. Server caps at 200.
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] =
    useState<"all" | FeedbackStatus>("all");
  const [filterCat, setFilterCat] =
    useState<"all" | FeedbackCategoryAdmin>("all");

  // Selected row for the right-side detail panel. The detail mirror
  // here is just the latest list-row payload — patches mutate the
  // underlying row + invalidate, react-query refetches and we re-set
  // selected from the new list (selected.id stays stable).
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((f) => {
      if (filterStatus !== "all" && f.status !== filterStatus) return false;
      if (filterCat !== "all" && f.category_admin !== filterCat) return false;
      if (q) {
        const hay = [f.message, f.user_name ?? "", ...(f.tags ?? [])]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filterStatus, filterCat]);

  // Re-sync the detail panel after a patch so it reflects the
  // freshest server-returned row instead of going stale.
  const handlePatch = useCallback(
    async (id: number, patch: Parameters<typeof patchFeedback>[1]) => {
      setActionError(null);
      try {
        const { feedback } = await patchFeedback(id, patch);
        setSelected(feedback);
        invalidateList();
      } catch (err) {
        setActionError((err as Error).message);
      }
    },
    [invalidateList]
  );

  const newCount = rows?.filter((f) => f.status === "new").length ?? 0;

  return (
    <div>
      <PageHeader
        title="Feedback"
        sub={rows ? `${newCount} unread` : undefined}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left column — list */}
        <Card>
          <div
            style={{ padding: "14px 16px", borderBottom: "1px solid #EDF0F3" }}
          >
            <FilterBar>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search feedback…"
                width={220}
              />
              <Select
                value={filterStatus}
                onValueChange={(v) =>
                  setFilterStatus(v as "all" | FeedbackStatus)
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
                value={filterCat}
                onValueChange={(v) =>
                  setFilterCat(v as "all" | FeedbackCategoryAdmin)
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {ADMIN_CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CAT_LABELS[c] ?? c}
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
            <EmptyState title="No feedback matches the current filters." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filtered.map((f) => (
                <FeedbackRow
                  key={f.id}
                  row={f}
                  active={selected?.id === f.id}
                  onClick={() => {
                    setSelected(f);
                    setActionError(null);
                  }}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Right column — sticky detail panel */}
        <Card style={{ position: "sticky", top: 72 }}>
          {!selected ? (
            <EmptyState
              title="Select an item"
              desc="Click a feedback item to review it here."
            />
          ) : (
            <FeedbackDetail
              item={selected}
              actionError={actionError}
              onClose={() => {
                setSelected(null);
                setActionError(null);
              }}
              onPatch={handlePatch}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// List row
// ─────────────────────────────────────────────────────────────────────────────

function FeedbackRow({
  row,
  active,
  onClick,
}: {
  row: FeedbackListRow;
  active: boolean;
  onClick: () => void;
}) {
  const sentimentColor = row.sentiment ? SENTIMENT_COLOR[row.sentiment] : "#B6C7D6";
  const sentimentGlyph = row.sentiment ? SENTIMENT_GLYPH[row.sentiment] : "—";
  const adminCatLabel = row.category_admin
    ? CAT_LABELS[row.category_admin] ?? row.category_admin
    : null;
  const fallbackCatLabel = USER_CATEGORY_LABELS[row.category];
  const tags = row.tags ?? [];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "14px 16px",
        borderBottom: "1px solid #EDF0F3",
        cursor: "pointer",
        background: active ? "#F7F8FA" : "transparent",
        border: "none",
        borderRadius: 0,
        width: "100%",
        font: "inherit",
        color: "inherit",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: sentimentColor }}>
          {sentimentGlyph}
        </span>
        <span style={{ fontSize: 12, color: "#777D86", fontWeight: 500 }}>
          {adminCatLabel ?? (
            <span style={{ fontStyle: "italic", color: "#B6C7D6" }}>
              {fallbackCatLabel}
            </span>
          )}
        </span>
        <Chip status={row.status} />
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "#B6C7D6",
            whiteSpace: "nowrap",
          }}
        >
          {formatDateShort(row.created_at)}
        </span>
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#24262B",
          lineHeight: 1.45,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {row.message}
      </div>
      <div style={{ fontSize: 11, color: "#777D86", marginTop: 5 }}>
        {row.user_name ?? "Anonymous"} · ★ {row.rating}
      </div>
      {tags.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 4,
            marginTop: 6,
            flexWrap: "wrap",
          }}
        >
          {tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 4,
                background: "#EDF0F3",
                color: "#555B63",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail panel
// ─────────────────────────────────────────────────────────────────────────────

type EditMode = "tags" | "link" | "assign" | "categorize" | null;

function FeedbackDetail({
  item,
  actionError,
  onClose,
  onPatch,
}: {
  item: Feedback;
  actionError: string | null;
  onClose: () => void;
  onPatch: (
    id: number,
    patch: Parameters<typeof patchFeedback>[1]
  ) => Promise<void>;
}) {
  const [mode, setMode] = useState<EditMode>(null);

  // Inline editor drafts — initialised from the row each time the
  // matching pencil opens; resets when mode changes or item.id changes.
  const [tagsDraft, setTagsDraft] = useState("");
  const [linkParkDraft, setLinkParkDraft] = useState("");
  const [linkBugDraft, setLinkBugDraft] = useState("");
  const [assigneeDraft, setAssigneeDraft] = useState("");

  const open = (m: EditMode) => {
    if (m === "tags") setTagsDraft((item.tags ?? []).join(", "));
    if (m === "link") {
      setLinkParkDraft(item.linked_park_id ?? "");
      setLinkBugDraft(item.linked_bug_id ?? "");
    }
    if (m === "assign") setAssigneeDraft(item.assignee ?? "");
    setMode(m);
  };

  const close = () => setMode(null);

  const sentimentGlyph = item.sentiment ? SENTIMENT_GLYPH[item.sentiment] : "—";
  const sentimentColor = item.sentiment
    ? SENTIMENT_COLOR[item.sentiment]
    : "#B6C7D6";
  const adminCatLabel = item.category_admin
    ? CAT_LABELS[item.category_admin] ?? item.category_admin
    : null;

  const saveTags = async () => {
    const tags = tagsDraft
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 16);
    // First-time tagging advances status from new → tagged so the
    // dashboard "tagged" filter actually surfaces it.
    const patch: Parameters<typeof patchFeedback>[1] = { tags };
    if (item.status === "new" && tags.length > 0) patch.status = "tagged";
    await onPatch(item.id, patch);
    close();
  };

  const saveLink = async () => {
    const patch: Parameters<typeof patchFeedback>[1] = {
      linked_park_id: linkParkDraft.trim() || null,
      linked_bug_id: linkBugDraft.trim() || null,
    };
    if (item.status === "new" && (patch.linked_park_id || patch.linked_bug_id)) {
      patch.status = "tagged";
    }
    await onPatch(item.id, patch);
    close();
  };

  const saveAssign = async () => {
    await onPatch(item.id, {
      assignee: assigneeDraft.trim() || null,
    });
    close();
  };

  return (
    <div style={{ padding: 16 }}>
      {/* Header strip */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <span
          style={{ fontSize: 20, fontWeight: 700, color: sentimentColor }}
          aria-label={item.sentiment ?? "no sentiment"}
        >
          {sentimentGlyph}
        </span>
        <Chip status={item.status} />
        <span style={{ fontSize: 12, color: "#777D86", fontWeight: 500 }}>
          {adminCatLabel ?? "—"}
        </span>
        <button
          onClick={onClose}
          aria-label="Close detail"
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#B6C7D6",
            display: "flex",
            padding: 4,
          }}
        >
          {IC.x}
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#777D86", marginBottom: 8 }}>
        {item.user_name ?? "Anonymous"} · {formatDateTime(item.created_at)} ·
        ★ {item.rating}
      </div>

      <div
        style={{
          fontSize: 14,
          color: "#24262B",
          lineHeight: 1.6,
          marginBottom: 16,
          padding: "12px",
          background: "#F7F8FA",
          borderRadius: 8,
          border: "1px solid #EDF0F3",
          whiteSpace: "pre-wrap",
        }}
      >
        {item.message}
      </div>

      {/* User-submitted category — read-only context. Always show so
          the admin can see what the user actually picked vs. the
          category_admin re-tag. */}
      <div
        style={{
          fontSize: 11,
          color: "#777D86",
          marginBottom: 12,
          fontStyle: "italic",
        }}
      >
        User submitted as: {USER_CATEGORY_LABELS[item.category]}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          marginBottom: 16,
        }}
      >
        {item.linked_park_id && (
          <DetailRow
            label="Linked Park"
            value={item.linked_park_name ?? item.linked_park_id}
          />
        )}
        {item.linked_bug_id && (
          <DetailRow
            label="Linked Bug"
            value={item.linked_bug_title ?? item.linked_bug_id}
            mono
          />
        )}
        {item.assignee && (
          <DetailRow label="Assignee" value={item.assignee} />
        )}
        {(item.tags ?? []).length > 0 && (
          <DetailRow
            label="Tags"
            value={(item.tags ?? []).join(", ")}
          />
        )}
      </div>

      {/* Sentiment + admin-category controls */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#777D86",
              marginBottom: 4,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Sentiment
          </div>
          <Select
            value={item.sentiment ?? ""}
            onValueChange={(v) =>
              void onPatch(item.id, {
                sentiment: v === "" ? null : (v as FeedbackSentiment),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {SENTIMENT_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#777D86",
              marginBottom: 4,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Admin category
          </div>
          <Select
            value={item.category_admin ?? ""}
            onValueChange={(v) =>
              void onPatch(item.id, {
                category_admin: v === "" ? null : (v as FeedbackCategoryAdmin),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CAT_LABELS[c] ?? c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Inline editors — opened by clicking the action chips below */}
      {mode === "tags" && (
        <InlineEditor
          label="Tags"
          hint="Comma-separated; up to 16, each ≤32 chars."
          value={tagsDraft}
          onChange={setTagsDraft}
          onSave={saveTags}
          onCancel={close}
        />
      )}
      {mode === "link" && (
        <div style={{ marginBottom: 12 }}>
          <InlineEditor
            label="Linked Park ID"
            value={linkParkDraft}
            onChange={setLinkParkDraft}
            onSave={saveLink}
            onCancel={close}
            hideButtons
          />
          <InlineEditor
            label="Linked Bug ID"
            hint="Empty either to unlink. Saves both at once."
            value={linkBugDraft}
            onChange={setLinkBugDraft}
            onSave={saveLink}
            onCancel={close}
          />
        </div>
      )}
      {mode === "assign" && (
        <InlineEditor
          label="Assignee"
          hint="Free text (admin name/handle). Empty to unassign."
          value={assigneeDraft}
          onChange={setAssigneeDraft}
          onSave={saveAssign}
          onCancel={close}
        />
      )}

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

      {/* Action chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Btn variant="secondary" size="xs" onClick={() => open("tags")}>
          {IC.tag} Tag
        </Btn>
        <Btn variant="secondary" size="xs" onClick={() => open("link")}>
          {IC.link} Link
        </Btn>
        <Btn variant="secondary" size="xs" onClick={() => open("assign")}>
          {IC.user} Assign
        </Btn>
        {item.status !== "responded" && (
          <Btn
            variant="secondary"
            size="xs"
            onClick={() =>
              void onPatch(item.id, { status: "responded" })
            }
          >
            {IC.check} Mark responded
          </Btn>
        )}
        {item.status !== "archived" && (
          <Btn
            variant="ghost"
            size="xs"
            onClick={() => void onPatch(item.id, { status: "archived" })}
          >
            {IC.x} Archive
          </Btn>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline editor (single-line / textarea swap based on label)
// ─────────────────────────────────────────────────────────────────────────────

function InlineEditor({
  label,
  hint,
  value,
  onChange,
  onSave,
  onCancel,
  hideButtons,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void> | void;
  onCancel: () => void;
  hideButtons?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#777D86",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          display: "block",
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
      {hint && (
        <div style={{ fontSize: 11, color: "#777D86", marginTop: 4 }}>
          {hint}
        </div>
      )}
      {!hideButtons && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <Btn variant="brand" size="xs" onClick={() => void onSave()}>
            Save
          </Btn>
          <Btn variant="ghost" size="xs" onClick={onCancel}>
            Cancel
          </Btn>
        </div>
      )}
    </div>
  );
}
