import type { ReactNode } from "react";
import { IC } from "./icons";

export interface TimelineItem {
  text: ReactNode;
  time: ReactNode;
  icon?: ReactNode;
  bold?: boolean;
}

export default function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            paddingBottom: i < items.length - 1 ? 16 : 0,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#F7F8FA",
                border: "1px solid #EDF0F3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#777D86",
                zIndex: 1,
              }}
            >
              {item.icon || IC.clock}
            </div>
            {i < items.length - 1 && (
              <div
                style={{
                  width: 1,
                  flex: 1,
                  background: "#EDF0F3",
                  marginTop: 4,
                }}
              />
            )}
          </div>
          <div style={{ paddingTop: 4, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                color: "#24262B",
                fontWeight: item.bold ? 600 : 400,
                lineHeight: 1.5,
              }}
            >
              {item.text}
            </div>
            <div style={{ fontSize: 11, color: "#777D86", marginTop: 2 }}>
              {item.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
