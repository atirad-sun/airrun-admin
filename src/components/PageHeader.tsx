import type { ReactNode } from "react";
import { IC } from "./icons";

interface PageHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  back?: boolean;
  onBack?: () => void;
}

export default function PageHeader({ title, sub, actions, back, onBack }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 24,
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {back && (
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "1px solid #EDF0F3",
              borderRadius: 8,
              padding: "6px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "#777D86",
              marginTop: 2,
              flexShrink: 0,
            }}
          >
            {IC.chevronLeft}
          </button>
        )}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "#24262B",
            }}
          >
            {title}
          </h1>
          {sub && (
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#777D86" }}>{sub}</p>
          )}
        </div>
      </div>
      {actions && (
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>
      )}
    </div>
  );
}
