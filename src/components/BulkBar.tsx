import type { ReactNode } from "react";
import { IC } from "./icons";

interface BulkBarProps {
  count: number;
  onClear: () => void;
  actions?: ReactNode;
}

export default function BulkBar({ count, onClear, actions }: BulkBarProps) {
  if (!count) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        background: "#F0FDF8",
        border: "1px solid #A7F3D0",
        borderRadius: 8,
        marginBottom: 12,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: "#0A2E22" }}>
        {count} selected
      </span>
      {actions && <div style={{ display: "flex", gap: 6 }}>{actions}</div>}
      <button
        onClick={onClear}
        style={{
          marginLeft: "auto",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#777D86",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {IC.x} Clear
      </button>
    </div>
  );
}
