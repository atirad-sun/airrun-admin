// Port of airrun-design/project/admin-page-dashboard.jsx.
// Composition-only: every primitive comes from the R1 component set
// (MetricCard, AqiChip, SevChip, PageHeader, Btn, Card, EmptyState,
// LoadingState).  Recharts is gone — the AQI bar is hand-rolled per
// the design.

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { fetchOverview, fetchStationFreshness } from "@/lib/adminApi";
import { qk } from "@/lib/queries";
import { CAT_LABELS } from "@/lib/cfg";
import { IC } from "@/components/icons";
import AqiChip from "@/components/AqiChip";
import Btn from "@/components/Btn";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import PageHeader from "@/components/PageHeader";
import SevChip from "@/components/SevChip";

const ACTIVITY_DOT: Record<string, string> = {
  report: "#EF4B4B",
  bug: "#F7B731",
  feedback: "#1888FF",
  park: "#04DC9A",
  user: "#777D86",
};

// Backend returns 7 EPA bands; design uses 3.  Collapse Good→good,
// Moderate→moderate, USG/Unhealthy/VeryUnhealthy/Hazardous/Unknown→poor
// (Unknown buckets as poor so missing-data parks still surface as
// concerning rather than silently looking healthy).
function bucket3(distribution: { band: string; count: number }[]) {
  const out = { good: 0, moderate: 0, poor: 0 };
  for (const { band, count } of distribution) {
    if (band === "Good") out.good += count;
    else if (band === "Moderate") out.moderate += count;
    else out.poor += count;
  }
  return out;
}

// Thai PCD aqi_status (VeryGood|Good|Moderate|Sensitive|Unhealthy) → 3-band
// chip UI. VeryGood collapses to good; Sensitive/Unhealthy collapse to poor.
function aqi3(status: string): "good" | "moderate" | "poor" {
  if (status === "VeryGood" || status === "Good") return "good";
  if (status === "Moderate") return "moderate";
  return "poor";
}

// "2026-04-28T07:22:00Z" → "07:22" if today, "Apr 26" otherwise.
function shortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) {
    return d.toTimeString().slice(0, 5);
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function activityTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) return d.toTimeString().slice(0, 5);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  )
    return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formattedToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function Overview() {
  const navigate = useNavigate();
  const { data, error } = useQuery({
    queryKey: qk.overview(),
    queryFn: fetchOverview,
  });
  const { data: stationFreshness } = useQuery({
    queryKey: qk.stationFreshness(),
    queryFn: fetchStationFreshness,
    staleTime: 5 * 60 * 1000,
  });

  if (error) {
    return (
      <div>
        <PageHeader title="Overview" />
        <div
          style={{
            background: "#FFF1F1",
            border: "1px solid #FECACA",
            borderRadius: 8,
            padding: 16,
            color: "#EF4B4B",
            fontSize: 13,
          }}
          role="alert"
        >
          Failed to load: {error.message}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Overview" />
        <LoadingState />
      </div>
    );
  }

  const { counts, counts_extra, aqi_distribution, activity, urgent_reports, urgent_bugs, top_parks } = data;
  const aqi = bucket3(aqi_distribution);
  const aqiTotal = aqi.good + aqi.moderate + aqi.poor || 1; // avoid /0 styling

  const hasUrgent = urgent_reports.length > 0 || urgent_bugs.length > 0;

  return (
    <div>
      <PageHeader
        title="Overview"
        sub={`${formattedToday()} · Production`}
        actions={
          <Btn variant="secondary" size="sm">
            <span style={{ display: "inline-flex" }}>{IC.download}</span>
            Export report
          </Btn>
        }
      />

      {/* 5-column metric grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <MetricCard
          label="Active Parks"
          value={counts_extra.parks_visible}
          sub={`${counts.parks} total`}
          icon={IC.parks}
        />
        <MetricCard
          label="Total Users"
          value={counts.users}
          icon={IC.users}
        />
        <MetricCard
          label="Pending Reports"
          value={counts_extra.reports_new}
          sub={counts_extra.reports_new > 0 ? "Needs attention" : "All caught up"}
          accent={counts_extra.reports_new > 0 ? "#EF4B4B" : undefined}
          icon={IC.reports}
        />
        <MetricCard
          label="Open Bugs"
          value={counts.bugs_open}
          sub={`${counts_extra.bugs_high_open} high severity`}
          accent={counts.bugs_open > 0 ? "#F7B731" : undefined}
          icon={IC.bugs}
        />
        <MetricCard
          label="New Feedback"
          value={counts_extra.feedback_new}
          sub="Awaiting review"
          icon={IC.feedback}
        />
      </div>

      {/* Body: 1fr 320px split */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {hasUrgent && (
            <Card
              style={{
                padding: "16px 20px",
                border: "1px solid #FECACA",
                background: "#FFF8F8",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#EF4B4B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {IC.alertCircle} Requires attention
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {urgent_reports.map((r) => (
                  <div
                    key={`r-${r.id}`}
                    onClick={() => navigate("/reports")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      background: "#fff",
                      borderRadius: 8,
                      border: "1px solid #FECACA",
                      cursor: "pointer",
                    }}
                  >
                    <SevChip sev={r.severity} />
                    <span style={{ fontSize: 13, color: "#24262B", flex: 1, minWidth: 0 }}>
                      {r.category ? CAT_LABELS[r.category] ?? r.category : "Report"}
                      {r.park_name && (
                        <>
                          {" · "}
                          <span style={{ color: "#777D86" }}>{r.park_name}</span>
                        </>
                      )}
                    </span>
                    <span style={{ fontSize: 11, color: "#777D86" }}>
                      {shortTime(r.created_at)}
                    </span>
                    <span style={{ color: "#B6C7D6", display: "flex" }}>{IC.chevronRight}</span>
                  </div>
                ))}
                {urgent_bugs.map((b) => (
                  <div
                    key={`b-${b.id}`}
                    onClick={() => navigate("/bugs")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      background: "#fff",
                      borderRadius: 8,
                      border: "1px solid #FECACA",
                      cursor: "pointer",
                    }}
                  >
                    <SevChip sev={b.severity} />
                    <span style={{ fontSize: 13, color: "#24262B", flex: 1, minWidth: 0 }}>
                      {b.title}
                    </span>
                    <span style={{ fontSize: 11, color: "#777D86" }}>
                      {shortTime(b.created_at)}
                    </span>
                    <span style={{ color: "#B6C7D6", display: "flex" }}>{IC.chevronRight}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Park AQI Status */}
          <Card>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #EDF0F3",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "#24262B" }}>
                Park AQI Status
              </span>
              <button
                onClick={() => navigate("/parks")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#777D86",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                View all {IC.chevronRight}
              </button>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {/* Distribution bar */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    height: 10,
                    borderRadius: 6,
                    overflow: "hidden",
                    gap: 2,
                    marginBottom: 10,
                    background: "#EDF0F3",
                  }}
                >
                  <div
                    style={{
                      flex: aqi.good,
                      background: "#13B981",
                      borderRadius: "6px 0 0 6px",
                    }}
                    title={`Good: ${aqi.good}`}
                  />
                  <div
                    style={{ flex: aqi.moderate, background: "#F7B731" }}
                    title={`Moderate: ${aqi.moderate}`}
                  />
                  <div
                    style={{
                      flex: aqi.poor,
                      background: "#EF4B4B",
                      borderRadius: "0 6px 6px 0",
                    }}
                    title={`Poor: ${aqi.poor}`}
                  />
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {(
                    [
                      ["#13B981", "Good", aqi.good],
                      ["#F7B731", "Moderate", aqi.moderate],
                      ["#EF4B4B", "Poor", aqi.poor],
                    ] as const
                  ).map(([c, l, n]) => (
                    <div
                      key={l}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        color: "#777D86",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: c,
                          display: "inline-block",
                        }}
                      />
                      {l}{" "}
                      <strong style={{ color: "#24262B" }}>{n}</strong>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#B6C7D6",
                    marginTop: 6,
                  }}
                >
                  {aqiTotal} parks tracked
                </div>
              </div>

              {/* Top park rows */}
              {top_parks.length === 0 ? (
                <EmptyState title="No parks yet" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {top_parks.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigate("/parks")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom: "1px solid #EDF0F3",
                        gap: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#24262B",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#777D86" }}>
                          {p.district || "—"}
                        </div>
                      </div>
                      <AqiChip value={p.aqi} status={aqi3(p.aqi_status)} />
                      {!p.visible && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#777D86",
                            background: "#F3F4F6",
                            padding: "1px 6px",
                            borderRadius: 4,
                          }}
                        >
                          Hidden
                        </span>
                      )}
                      {p.aqi_updated_at && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#B6C7D6",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {shortTime(p.aqi_updated_at)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Data Freshness */}
          {(() => {
            const STALE_MIN = 90;
            const now = Date.now();
            let fresh = 0, stale = 0;
            for (const p of top_parks) {
              if (!p.aqi_updated_at) { stale++; continue; }
              const ageMins = (now - new Date(p.aqi_updated_at).getTime()) / 60_000;
              if (ageMins <= STALE_MIN) fresh++; else stale++;
            }
            const total = fresh + stale;
            const freshPct = total > 0 ? Math.round((fresh / total) * 100) : 0;
            return (
              <Card>
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #EDF0F3",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#24262B" }}>
                    Data Freshness
                  </span>
                </div>
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "#777D86" }}>Fresh (&lt;90 min)</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#13B981" }}>{fresh}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "#777D86" }}>Stale (&gt;90 min)</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: stale > 0 ? "#EF4B4B" : "#B6C7D6" }}>{stale}</span>
                  </div>
                  {/* Freshness bar */}
                  <div
                    style={{
                      display: "flex",
                      height: 8,
                      borderRadius: 6,
                      overflow: "hidden",
                      background: "#EDF0F3",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: `${freshPct}%`,
                        background: "#13B981",
                        borderRadius: 6,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "#B6C7D6" }}>
                    {freshPct}% of top {total} parks fresh · threshold 90 min
                  </div>

                  {stationFreshness && (() => {
                    const sFresh = stationFreshness.fresh;
                    const sTotal = stationFreshness.total;
                    const sStale = stationFreshness.stale;
                    const sFreshPct = sTotal > 0 ? Math.round((sFresh / sTotal) * 100) : 0;
                    return (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: "#24262B", fontWeight: 600 }}>สถานี AQI (&lt;90 นาที)</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: "#777D86" }}>Fresh</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#13B981" }}>{sFresh}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 12, color: "#777D86" }}>Stale</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: sStale > 0 ? "#EF4B4B" : "#B6C7D6" }}>{sStale}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            height: 8,
                            borderRadius: 6,
                            overflow: "hidden",
                            background: "#EDF0F3",
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              width: `${sFreshPct}%`,
                              background: "#13B981",
                              borderRadius: 6,
                              transition: "width 0.4s",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11, color: "#B6C7D6" }}>
                          {sFreshPct}% of {sTotal} stations fresh · oldest {stationFreshness.oldest_age_min} min ago
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Card>
            );
          })()}

          {/* Recent Activity */}
          <Card>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #EDF0F3",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "#24262B" }}>
                Recent Activity
              </span>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {activity.length === 0 ? (
                <EmptyState title="No activity yet" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {activity.map((item, i) => {
                    const isLast = i === activity.length - 1;
                    return (
                      <div
                        key={`${item.kind}-${i}-${item.created_at}`}
                        style={{
                          display: "flex",
                          gap: 10,
                          paddingBottom: isLast ? 0 : 14,
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
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: ACTIVITY_DOT[item.kind] ?? "#B6C7D6",
                              marginTop: 4,
                              flexShrink: 0,
                              zIndex: 1,
                            }}
                          />
                          {!isLast && (
                            <div
                              style={{
                                width: 1,
                                flex: 1,
                                background: "#EDF0F3",
                                marginTop: 3,
                              }}
                            />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#24262B",
                              lineHeight: 1.45,
                            }}
                          >
                            {item.summary}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#B6C7D6",
                              marginTop: 1,
                            }}
                          >
                            {activityTimeLabel(item.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Quick Links */}
          <Card style={{ padding: "16px 20px" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#24262B",
                marginBottom: 12,
              }}
            >
              Quick Links
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(
                [
                  {
                    label: `${counts_extra.reports_new} new report${counts_extra.reports_new !== 1 ? "s" : ""}`,
                    sub: "Needs review",
                    to: "/reports",
                    color: "#EF4B4B",
                  },
                  {
                    label: `${counts.bugs_open} open bug${counts.bugs_open !== 1 ? "s" : ""}`,
                    sub: "Open & triaged",
                    to: "/bugs",
                    color: "#F7B731",
                  },
                  {
                    label: `${counts_extra.feedback_new} unread feedback`,
                    sub: "Awaiting review",
                    to: "/feedback",
                    color: "#1888FF",
                  },
                  {
                    label: `${counts_extra.parks_unverified} parks unverified`,
                    sub: "Data needs check",
                    to: "/parks",
                    color: "#777D86",
                  },
                ] as const
              ).map((q) => (
                <button
                  key={q.to}
                  onClick={() => navigate(q.to)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#F0FDF8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#F7F8FA")
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    background: "#F7F8FA",
                    border: "1px solid #EDF0F3",
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: q.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: "#24262B",
                      fontWeight: 500,
                    }}
                  >
                    {q.label}
                  </span>
                  <span style={{ fontSize: 11, color: "#777D86" }}>{q.sub}</span>
                  <span style={{ color: "#B6C7D6", display: "flex" }}>
                    {IC.chevronRight}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
