export default function LatencyTimeline({ metrics }) {
  const { ttft, totalLatency, status } = metrics;

  const hasData = ttft != null && totalLatency != null && totalLatency > 0;
  const genLatency = hasData ? totalLatency - ttft : 0;
  const ttftPct = hasData ? Math.max(2, Math.min(40, (ttft / totalLatency) * 100)) : 0;
  const genPct = hasData ? 100 - ttftPct : 0;

  return (
    <div className="card timeline-card">
      <div className="section-label">Latency Breakdown</div>
      {!hasData ? (
        <div className="chart-empty">Latency timeline appears after completion</div>
      ) : (
        <>
          <div className="timeline-bar">
            <div
              className="tl-segment tl-ttft"
              style={{ width: `${ttftPct}%` }}
              title={`TTFT: ${ttft}ms`}
            >
              {ttftPct > 10 && <span className="tl-label">TTFT</span>}
            </div>
            <div
              className="tl-segment tl-gen"
              style={{ width: `${genPct}%` }}
              title={`Generation: ${genLatency}ms`}
            >
              {genPct > 15 && <span className="tl-label">Generation</span>}
            </div>
          </div>
          <div className="timeline-legend">
            <span className="tl-leg-item">
              <span className="tl-dot dot-ttft" />
              TTFT — {ttft}ms
            </span>
            <span className="tl-leg-item">
              <span className="tl-dot dot-gen" />
              Generation — {genLatency}ms
            </span>
            <span className="tl-leg-item tl-total">
              Total — {totalLatency}ms
            </span>
          </div>
        </>
      )}
    </div>
  );
}
