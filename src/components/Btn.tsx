import type { CSSProperties, MouseEvent, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "brand";
type Size = "xs" | "sm";

interface BtnProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
  title?: string;
}

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: { background: "#04DC9A", color: "#0A2E22" },
  secondary: {
    background: "#fff",
    color: "#24262B",
    border: "1px solid #EDF0F3",
  },
  ghost: { background: "transparent", color: "#24262B" },
  danger: { background: "#FFF1F1", color: "#EF4B4B" },
  brand: { background: "#04DC9A", color: "#0A2E22", fontWeight: 600 },
};

export default function Btn({
  children,
  variant = "secondary",
  size = "sm",
  onClick,
  disabled,
  type = "button",
  style: sx = {},
  title,
}: BtnProps) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    fontFamily: "inherit",
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    transition: "background 0.12s",
    fontSize: size === "xs" ? 12 : 13,
    padding: size === "xs" ? "4px 10px" : "6px 14px",
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...VARIANTS[variant], opacity: disabled ? 0.5 : 1, ...sx }}
    >
      {children}
    </button>
  );
}
