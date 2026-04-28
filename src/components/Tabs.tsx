export interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid #EDF0F3",
        marginBottom: 20,
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: isActive ? "2px solid #04DC9A" : "2px solid transparent",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "#24262B" : "#777D86",
              cursor: "pointer",
              transition: "all 0.12s",
              marginBottom: -1,
            }}
          >
            {t.label}
            {t.count != null && (
              <span
                style={{
                  marginLeft: 5,
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: isActive ? "#04DC9A22" : "#EDF0F3",
                  fontSize: 11,
                  fontWeight: 600,
                  color: isActive ? "#04A074" : "#777D86",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
