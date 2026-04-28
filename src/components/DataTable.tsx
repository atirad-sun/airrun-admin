// Design-faithful port of airrun-design/project/admin-base.jsx:154-215.
// Replaces the prior shadcn-Table wrap; this version owns its own <table>
// markup so cell padding, header tint, hover bg, and sort icons match the
// design pixel-for-pixel.

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { IC } from "./icons";

export interface Column<T> {
  key: string;
  /** Design API. */
  label?: ReactNode;
  /** How to render the cell. Receives both the row's value at `key` and the row itself. */
  render?: (value: unknown, row: T) => ReactNode;
  sortable?: boolean;
  maxWidth?: number | string;
  cellStyle?: CSSProperties;

  // Phase-C back-compat (Bugs screen) — will be removed once R3 rewrites Bugs
  // against the design API. Don't add new uses.
  header?: ReactNode;
  cell?: (row: T) => ReactNode;
  className?: string;
  fill?: boolean;
}

interface DataTableProps<T extends { id: string | number }> {
  cols?: Column<T>[];
  rows: T[];
  onRow?: (row: T) => void;
  emptyMsg?: string;
  selectedIds?: Array<T["id"]>;
  onSelect?: (ids: Array<T["id"]>) => void;

  // Phase-C back-compat aliases (see note above).
  columns?: Column<T>[];
  rowKey?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

type SortDir = "asc" | "desc";

export default function DataTable<T extends { id: string | number }>({
  cols,
  rows,
  onRow,
  emptyMsg,
  selectedIds,
  onSelect,
  columns,
  onRowClick,
  emptyMessage,
  loading,
}: DataTableProps<T>) {
  const effectiveCols = cols ?? columns ?? [];
  const effectiveOnRow = onRow ?? onRowClick;
  const effectiveEmpty = emptyMsg ?? emptyMessage ?? "No records found.";

  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: string) => {
    if (sortCol === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortCol) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortCol];
      const bv = (b as Record<string, unknown>)[sortCol];
      if (av == null) return 1;
      if (bv == null) return -1;
      // unknown comparison — relies on JS coercion which is fine for the
      // mixed string/number columns we actually feed this.
      return ((av as number | string) > (bv as number | string) ? 1 : -1) *
        (sortDir === "asc" ? 1 : -1);
    });
    return copy;
  }, [rows, sortCol, sortDir]);

  const selectedSet = new Set(selectedIds ?? []);
  const allSelected = rows.length > 0 && selectedSet.size === rows.length;
  const cols2 = effectiveCols;

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: "#777D86",
          fontSize: 13,
          background: "#fff",
          border: "1px solid #EDF0F3",
          borderRadius: 8,
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #EDF0F3" }}>
            {onSelect && (
              <th style={{ width: 36, padding: "8px 12px", textAlign: "left" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    onSelect(e.target.checked ? rows.map((r) => r.id) : [])
                  }
                />
              </th>
            )}
            {cols2.map((col) => (
              <th
                key={col.key}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  color: "#777D86",
                  fontWeight: 600,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  cursor: col.sortable ? "pointer" : "default",
                  userSelect: "none",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  {col.label ?? col.header}
                  {col.sortable && sortCol === col.key && (
                    <span style={{ color: "#24262B" }}>
                      {sortDir === "asc" ? IC.arrowUp : IC.arrowDown}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td
                colSpan={cols2.length + (onSelect ? 1 : 0)}
                style={{
                  padding: "32px 12px",
                  textAlign: "center",
                  color: "#777D86",
                }}
              >
                {effectiveEmpty}
              </td>
            </tr>
          )}
          {sorted.map((row) => {
            const isSelected = selectedSet.has(row.id);
            return (
              <tr
                key={row.id}
                onClick={effectiveOnRow ? () => effectiveOnRow(row) : undefined}
                style={{
                  borderBottom: "1px solid #EDF0F3",
                  cursor: effectiveOnRow ? "pointer" : "default",
                  background: isSelected ? "#F0FDF8" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (effectiveOnRow) {
                    e.currentTarget.style.background = isSelected
                      ? "#E8FBF4"
                      : "#F7F8FA";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected
                    ? "#F0FDF8"
                    : "transparent";
                }}
              >
                {onSelect && (
                  <td
                    style={{ padding: "10px 12px" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...(selectedIds ?? []), row.id]
                          : (selectedIds ?? []).filter((id) => id !== row.id);
                        onSelect(next);
                      }}
                    />
                  </td>
                )}
                {cols2.map((col) => {
                  const raw = (row as Record<string, unknown>)[col.key];
                  return (
                    <td
                      key={col.key}
                      style={{
                        padding: "10px 12px",
                        color: "#24262B",
                        verticalAlign: "middle",
                        maxWidth: col.maxWidth ?? "none",
                        ...col.cellStyle,
                      }}
                    >
                      {col.cell
                        ? col.cell(row)
                        : col.render
                          ? col.render(raw, row)
                          : (raw as ReactNode)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
