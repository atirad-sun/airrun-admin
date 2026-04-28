export default function MapPlaceholder({ height = 180 }: { height?: number }) {
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
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <span style={{ fontSize: 12, fontFamily: "monospace" }}>map / satellite view</span>
    </div>
  );
}
