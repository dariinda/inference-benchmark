export default function HistoryPanel({ history }) {
  if (history.length === 0) return null;

  return (
    <div className="card history-card">
      <div className="section-label">Run History</div>
      <div className="history-list">
        {history.map((run) => (
          <div key={run.id} className="history-row">
            <div className="history-meta">
              <span className="history-model">{run.config.model}</span>
              <span className="history-provider">{run.config.provider}</span>
              <span className="history-time">{run.timestamp}</span>
            </div>
            <div className="history-stats">
              <span className="history-stat">
                <span className="hstat-label">TPS</span>
                {run.metrics.tokensPerSec?.toFixed(1) ?? "—"}
              </span>
              <span className="history-stat">
                <span className="hstat-label">TTFT</span>
                {run.metrics.ttft ?? "—"}ms
              </span>
              <span className="history-stat">
                <span className="hstat-label">Tokens</span>
                {run.metrics.tokenCount}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
