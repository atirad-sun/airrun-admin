import { aqiCfg } from "@/lib/cfg";

interface AqiChipProps {
  value: number | string;
  status: string;
}

export default function AqiChip({ value, status }: AqiChipProps) {
  const cfg = aqiCfg(status);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.color,
          flexShrink: 0,
        }}
      />
      {value} · {cfg.label}
    </span>
  );
}
