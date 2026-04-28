import type { ReactNode } from "react";

export default function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}
