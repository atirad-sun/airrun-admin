// Lookup tables ported verbatim from airrun-design/project/admin-base.jsx:42-82.
// Source of truth for chip colors + labels across the SPA — every Chip/SevChip/
// AqiChip rendering pulls from these maps so that hex values stay locked to
// the design without a screen-by-screen audit later.

import { getBandColor, getBandThaiLabel, type AqiBand } from "@airrun/shared/aqi";

export interface CfgEntry {
  color: string;
  bg: string;
  label: string;
}

// Admin uses a 3-bucket chip UI (good/moderate/poor). Color + label come from
// the canonical shared Thai PCD bands; bg tints are admin-specific and stay local.
// Bucket → representative shared band:
//   good     → "Good"      (เขียว)
//   moderate → "Moderate"  (เหลือง)
//   poor     → "Sensitive" (ส้ม — VeryGood collapses to good, Unhealthy collapses to poor)
const PICK: Record<"good" | "moderate" | "poor", AqiBand> = {
  good:     "Good",
  moderate: "Moderate",
  poor:     "Sensitive",
};

export const AQI_CFG: Record<string, CfgEntry> = {
  good:     { color: getBandColor(PICK.good),     bg: "#F0FDF8", label: getBandThaiLabel(PICK.good)     },
  moderate: { color: getBandColor(PICK.moderate), bg: "#FFFBEB", label: getBandThaiLabel(PICK.moderate) },
  poor:     { color: getBandColor(PICK.poor),     bg: "#FFF1F1", label: getBandThaiLabel(PICK.poor)     },
};

export const STATUS_CFG: Record<string, CfgEntry> = {
  // report
  new: { color: "#1888FF", bg: "#EBF3FF", label: "New" },
  reviewing: { color: "#F7B731", bg: "#FFFBEB", label: "Reviewing" },
  resolved: { color: "#13B981", bg: "#F0FDF8", label: "Resolved" },
  dismissed: { color: "#777D86", bg: "#F3F4F6", label: "Dismissed" },
  // bug
  open: { color: "#EF4B4B", bg: "#FFF1F1", label: "Open" },
  triaged: { color: "#F7B731", bg: "#FFFBEB", label: "Triaged" },
  in_progress: { color: "#1888FF", bg: "#EBF3FF", label: "In Progress" },
  fixed: { color: "#13B981", bg: "#F0FDF8", label: "Fixed" },
  closed: { color: "#777D86", bg: "#F3F4F6", label: "Closed" },
  // user
  active: { color: "#13B981", bg: "#F0FDF8", label: "Active" },
  inactive: { color: "#777D86", bg: "#F3F4F6", label: "Inactive" },
  suspended: { color: "#EF4B4B", bg: "#FFF1F1", label: "Suspended" },
  // feedback
  tagged: { color: "#5AD7FF", bg: "#F0FBFF", label: "Tagged" },
  responded: { color: "#13B981", bg: "#F0FDF8", label: "Responded" },
  archived: { color: "#777D86", bg: "#F3F4F6", label: "Archived" },
};

export const SEV_CFG: Record<string, CfgEntry> = {
  low: { color: "#777D86", bg: "#F3F4F6", label: "Low" },
  medium: { color: "#F7B731", bg: "#FFFBEB", label: "Medium" },
  high: { color: "#EF4B4B", bg: "#FFF1F1", label: "High" },
  critical: { color: "#7C3AED", bg: "#F5F3FF", label: "Critical" },
};

export const CAT_LABELS: Record<string, string> = {
  incorrect_aqi: "Incorrect AQI",
  park_closed: "Park Closed",
  unsafe_route: "Unsafe Route",
  wrong_location: "Wrong Location",
  facility_issue: "Facility Issue",
  other: "Other",
  feature_request: "Feature Request",
  complaint: "Complaint",
  praise: "Praise",
  usability: "Usability Issue",
  data_quality: "Data Quality",
};

const FALLBACK: CfgEntry = { color: "#777D86", bg: "#F3F4F6", label: "" };

export function statusCfg(key: string | null | undefined): CfgEntry {
  if (!key) return FALLBACK;
  return STATUS_CFG[key] ?? AQI_CFG[key] ?? { ...FALLBACK, label: key };
}

export function sevCfg(key: string | null | undefined): CfgEntry {
  if (!key) return SEV_CFG.low;
  return SEV_CFG[key] ?? SEV_CFG.low;
}

export function aqiCfg(key: string | null | undefined): CfgEntry {
  if (!key) return AQI_CFG.good;
  return AQI_CFG[key] ?? AQI_CFG.good;
}
