// Single-line banner shown on data screens when the signed-in admin
// has the viewer role.  The backend is the security boundary (every
// mutating action returns 403 for viewers); this banner just sets
// expectations so viewers don't click buttons that fail.
//
// Uses pure inline styles to match the rest of the screens (no
// Tailwind here) — keeps the visual integration cost zero.

import type { CSSProperties } from "react";

const STYLE: CSSProperties = {
  fontSize: 12,
  color: "#6B5C00",
  background: "#FFF8E1",
  border: "1px solid #F4E4A0",
  borderRadius: 8,
  padding: "8px 12px",
  marginBottom: 12,
  lineHeight: 1.5,
};

export default function ReadOnlyBanner({
  what = "this screen",
}: {
  what?: string;
}) {
  return (
    <div role="status" style={STYLE}>
      You're signed in as a viewer — {what} is read-only. Ask a super-admin
      to change your role if you need to make edits.
    </div>
  );
}
