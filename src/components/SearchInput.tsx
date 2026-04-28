import { IC } from "./icons";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number | string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  width = 220,
}: SearchInputProps) {
  return (
    <div style={{ position: "relative", width }}>
      <span
        style={{
          position: "absolute",
          left: 9,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#777D86",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
        }}
      >
        {IC.search}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontFamily: "inherit",
          fontSize: 13,
          border: "1px solid #EDF0F3",
          borderRadius: 8,
          padding: "6px 10px 6px 30px",
          outline: "none",
          background: "#fff",
          color: "#24262B",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
