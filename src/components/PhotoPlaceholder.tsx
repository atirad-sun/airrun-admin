export default function PhotoPlaceholder({ height = 120 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        background: "#F0F4F8",
        borderRadius: 8,
        border: "1px solid #EDF0F3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        color: "#B6C7D6",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span style={{ fontSize: 12, fontFamily: "monospace" }}>photo attachment</span>
    </div>
  );
}
