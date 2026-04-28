import { statusCfg } from "@/lib/cfg";

interface ChipProps {
  status: string;
  size?: "xs" | "sm";
}

export default function Chip({ status, size = "sm" }: ChipProps) {
  const cfg = statusCfg(status);
  const pad = size === "xs" ? "1px 6px" : "2px 8px";
  const fs = size === "xs" ? 11 : 12;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: pad,
        borderRadius: 4,
        fontSize: fs,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
      }}
    >
      {cfg.label || status}
    </span>
  );
}
