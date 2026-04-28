import type { ReactNode } from "react";
import Card from "./Card";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
  icon?: ReactNode;
}

export default function MetricCard({ label, value, sub, accent, icon }: MetricCardProps) {
  return (
    <Card
      style={{
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#777D86",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
        {icon && (
          <span style={{ color: accent || "#04DC9A", opacity: 0.7 }}>{icon}</span>
        )}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: accent || "#24262B",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#777D86" }}>{sub}</div>}
    </Card>
  );
}
