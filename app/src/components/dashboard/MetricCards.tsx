import type { DashboardData } from "@/lib/dashboard/types";

export function MetricCards({ metrics }: { metrics: DashboardData["metrics"] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Metric
        label="Earned this week"
        value={metrics.earnedWeek}
        delta={`↗ from ${metrics.triesWeek} tries`}
        accent
      />
      <Metric
        label="Earned lifetime"
        value={metrics.earnedTotal}
        delta="USDC, Base beta"
      />
      <Metric
        label="Tries today"
        value={metrics.triesToday.toString()}
        delta="live"
      />
      <Metric
        label="Cache hit rate"
        value={metrics.cacheHit}
        delta={`avg TTL · ${metrics.avgTtl}`}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  delta,
  accent = false,
}: {
  label: string;
  value: string;
  delta?: string;
  accent?: boolean;
}) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div
        className="metric-value"
        style={accent ? { color: "var(--accent)" } : undefined}
      >
        {value}
      </div>
      {delta && <div className={`metric-delta ${accent ? "up" : ""}`}>{delta}</div>}
    </div>
  );
}
