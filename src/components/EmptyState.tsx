import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  desc?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, desc, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: 12,
        color: "#777D86",
      }}
    >
      <div style={{ fontSize: 32, opacity: 0.4 }}>{icon || "📭"}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#24262B" }}>{title}</div>
      {desc && (
        <div style={{ fontSize: 13, textAlign: "center", maxWidth: 280, lineHeight: 1.55 }}>
          {desc}
        </div>
      )}
      {action}
    </div>
  );
}
