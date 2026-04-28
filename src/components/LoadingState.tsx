export default function LoadingState() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        color: "#777D86",
        fontSize: 13,
        gap: 8,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          border: "2px solid #EDF0F3",
          borderTop: "2px solid #04DC9A",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      Loading…
    </div>
  );
}
