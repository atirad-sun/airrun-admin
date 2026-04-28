import type { ReactNode } from "react";

interface DetailRowProps {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
}

export default function DetailRow({ label, value, mono }: DetailRowProps) {
  if (value == null || value === "") return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: "8px 0",
        borderBottom: "1px solid #EDF0F3",
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#777D86",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          width: 140,
          flexShrink: 0,
          paddingTop: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "#24262B",
          flex: 1,
          fontFamily: mono ? "monospace" : "inherit",
          wordBreak: "break-all",
          lineHeight: 1.5,
        }}
      >
        {value}
      </span>
    </div>
  );
}
