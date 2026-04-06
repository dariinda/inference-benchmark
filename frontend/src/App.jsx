import { useState, useRef, useCallback } from "react";
import BenchmarkRunner from "./components/BenchmarkRunner";
import MetricCards from "./components/MetricCards";
import TokenRateChart from "./components/TokenRateChart";
import LatencyTimeline from "./time/LatencyTimeline";
import HistoryPanel from "./time/HistoryPanel";
import CompareRunner from "./components/CompareRunner";

const EMPTY_METRICS = {
  ttft: null,
  tokensPerSec: null,
  totalLatency: null,
  tokenCount: 0,
  snapshots: [],
  output: "",
  status: "idle",
};

export default function App() {
  const [mode, setMode] = useState("single");
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [history, setHistory] = useState([]);
  const startRef = useRef(null);
  const firstTokenRef = useRef(null);
  const tokenCountRef = useRef(0);
  const outputRef = useRef("");

  const handleStart = useCallback(() => {
    startRef.current = performance.now();
    firstTokenRef.current = null;
    tokenCountRef.current = 0;
    outputRef.current = "";
    setMetrics({ ...EMPTY_METRICS, status: "running" });
  }, []);

  const handleToken = useCallback((chunk) => {
    const now = performance.now();
    if (!firstTokenRef.current) firstTokenRef.current = now;
    tokenCountRef.current += 1;
    outputRef.current += chunk;
    const elapsed = now - startRef.current;
    const tps = (tokenCountRef.current / elapsed) * 1000;
    setMetrics((prev) => ({
      ...prev,
      ttft: Math.round(firstTokenRef.current - startRef.current),
      tokensPerSec: parseFloat(tps.toFixed(1)),
      tokenCount: tokenCountRef.current,
      output: outputRef.current,
      snapshots: [
        ...prev.snapshots,
        { t: Math.round(elapsed), tps: parseFloat(tps.toFixed(1)) },
      ],
    }));
  }, []);

  const handleEnd = useCallback((config) => {
    const now = performance.now();
    const totalLatency = Math.round(now - startRef.current);
    console.log("handleEnd called", new Error().stack);
    const finalTps = parseFloat(
      ((tokenCountRef.current / totalLatency) * 1000).toFixed(1)
    );
    setMetrics((prev) => {
      const finalMetrics = {
        ...prev,
        totalLatency,
        tokensPerSec: finalTps,
        status: "done",
      };
      setHistory((h) => [
        {
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString(),
          config,
          metrics: finalMetrics,
        },
        ...h.slice(0, 9),
      ]);
      return finalMetrics;
    });
  }, []);

  const handleError = useCallback((msg) => {
    setMetrics((prev) => ({ ...prev, status: "error", output: msg }));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">▶</span>
            <span className="logo-text">InferBench</span>
          </div>
          <span className="header-sub">Local LLM Benchmarking Dashboard</span>
          <div className="mode-tabs">
            <button
              className={`tab-btn ${mode === "single" ? "active" : ""}`}
              onClick={() => setMode("single")}
            >
              Single
            </button>
            <button
              className={`tab-btn ${mode === "compare" ? "active" : ""}`}
              onClick={() => setMode("compare")}
            >
              Compare
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {mode === "single" ? (
          <>
            <div className="left-col">
              <BenchmarkRunner
                onStart={handleStart}
                onToken={handleToken}
                onEnd={handleEnd}
                onError={handleError}
                status={metrics.status}
              />
              <MetricCards metrics={metrics} />
              <LatencyTimeline metrics={metrics} />
            </div>
            <div className="right-col">
              <TokenRateChart
                snapshots={metrics.snapshots}
                status={metrics.status}
              />
              {metrics.output && (
                <div className="output-box">
                  <div className="section-label">Model Output</div>
                  <pre className="output-text">{metrics.output}</pre>
                </div>
              )}
              <HistoryPanel history={history} />
            </div>
          </>
        ) : (
          <div className="compare-col">
            <CompareRunner />
          </div>
        )}
      </main>
    </div>
  );
}
