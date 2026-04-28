import type { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
}

export default function Card({ children, style: sx = {}, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        border: "1px solid #EDF0F3",
        borderRadius: 8,
        ...sx,
      }}
    >
      {children}
    </div>
  );
}
