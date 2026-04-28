import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchOverview, type OverviewResponse } from "@/lib/adminApi";

const BAND_COLOR: Record<string, string> = {
  Good: "#0EA673",
  Moderate: "#FBBF24",
  USG: "#FB923C",
  Unhealthy: "#F87171",
  VeryUnhealthy: "#A855F7",
  Hazardous: "#991B1B",
  Unknown: "#6B7280",
};

const KIND_LABEL: Record<string, string> = {
  report: "Report",
  feedback: "Feedback",
  bug: "Bug",
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Overview() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchOverview()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-destructive">Failed to load: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const kpis = [
    { label: "Parks", value: data.counts.parks },
    { label: "Users", value: data.counts.users },
    { label: "Reports (total)", value: data.counts.reports_total },
    { label: "Reports (24h)", value: data.counts.reports_today },
    { label: "Open bugs", value: data.counts.bugs_open },
    { label: "Feedback", value: data.counts.feedback_total },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-2xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      {/* AQI distribution */}
      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Parks by AQI band (current)
        </h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.aqi_distribution}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="band" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.aqi_distribution.map((entry) => (
                  <Cell
                    key={entry.band}
                    fill={BAND_COLOR[entry.band] ?? "#888"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent activity */}
      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Recent activity (last 20 across reports/feedback/bugs)
        </h2>
        {data.activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="divide-y">
            {data.activity.map((a, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-4 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="mr-2 inline-block min-w-16 rounded bg-secondary px-2 py-0.5 text-xs">
                    {KIND_LABEL[a.kind] ?? a.kind}
                  </span>
                  <span className="break-words">{a.summary}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelative(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
