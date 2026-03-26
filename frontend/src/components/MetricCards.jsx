export default function MetricCards({ metrics }) {
  const { ttft, tokensPerSec, totalLatency, tokenCount } = metrics;

  const cards = [
    {
      label: "Tokens / sec",
      value: tokensPerSec != null ? tokensPerSec.toFixed(1) : "—",
      unit: "tok/s",
      accent: "blue",
    },
    {
      label: "Time to First Token",
      value: ttft != null ? ttft : "—",
      unit: "ms",
      accent: "amber",
    },
    {
      label: "Total Latency",
      value: totalLatency != null ? totalLatency : "—",
      unit: "ms",
      accent: "coral",
    },
    {
      label: "Token Count",
      value: tokenCount != null ? tokenCount : "—",
      unit: "tok",
      accent: "teal",
    },
  ];

  return (
    <div className="metric-grid">
      {cards.map((c) => (
        <div key={c.label} className={`metric-card accent-${c.accent}`}>
          <div className="metric-label">{c.label}</div>
          <div className="metric-value">
            {c.value}
            <span className="metric-unit">{c.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
