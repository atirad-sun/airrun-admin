// 520px right-side drawer — port of airrun-design/project/admin-base.jsx:233-252.
// Hand-rolled (rather than shadcn Sheet) because the design specifies an exact
// transition timing + scrim opacity + fixed width that doesn't compose cleanly
// onto Sheet's styling.

import { useEffect } from "react";
import type { ReactNode } from "react";
import { IC } from "./icons";

interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  width?: number;
}

export default function DetailDrawer({
  open,
  onOpenChange,
  title,
  children,
  width = 520,
}: DetailDrawerProps) {
  // Esc to close — mirrors shadcn Sheet behavior.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <>
      {open && (
        <div
          onClick={() => onOpenChange(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(36,38,43,0.3)",
            zIndex: 900,
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width,
          background: "#fff",
          zIndex: 901,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          maxWidth: "95vw",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid #EDF0F3",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "#24262B" }}>
            {title}
          </span>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#777D86",
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Close drawer"
          >
            {IC.x}
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>{children}</div>
      </div>
    </>
  );
}
