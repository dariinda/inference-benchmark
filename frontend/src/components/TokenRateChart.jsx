import { useEffect, useRef } from "react";

export default function TokenRateChart({ snapshots, status }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
    const textColor = isDark ? "#9c9a92" : "#73726c";

    chartRef.current = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: snapshots.map((s) => (s.t / 1000).toFixed(1) + "s"),
        datasets: [
          {
            label: "Tokens/sec",
            data: snapshots.map((s) => s.tps),
            borderColor: "#378ADD",
            backgroundColor: "rgba(55,138,221,0.1)",
            borderWidth: 2,
            pointRadius: snapshots.length > 60 ? 0 : 2,
            pointBackgroundColor: "#378ADD",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y.toFixed(1)} tok/s`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
              maxTicksLimit: 10,
              autoSkip: true,
              font: { size: 11 },
            },
            grid: { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor, font: { size: 11 } },
            grid: { color: gridColor },
          },
        },
      },
    });
  }, [snapshots]);

  const isEmpty = snapshots.length === 0;

  return (
    <div className="card chart-card">
      <div className="section-label">
        Tokens/sec Over Time
        {status === "running" && <span className="live-dot" />}
      </div>
      {isEmpty ? (
        <div className="chart-empty">Run a benchmark to see live throughput</div>
      ) : (
        <div className="chart-wrap">
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  );
}
