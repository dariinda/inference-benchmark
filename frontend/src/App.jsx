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
  const endCalledRef = useRef(false);

  const handleStart = useCallback(() => {
    startRef.current = performance.now();
    firstTokenRef.current = null;
    tokenCountRef.current = 0;
    outputRef.current = "";
    endCalledRef.current = false;
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
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    const now = performance.now();
    const totalLatency = Math.round(now - startRef.current);
    const finalTps = parseFloat(
      ((tokenCountRef.current / totalLatency) * 1000).toFixed(1),
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

      // Save to Supabase
      console.log("Saving to Supabase:", config.model, finalTps);
      fetch("http://localhost:8000/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          provider: config.provider,
          prompt: config.prompt,
          tokens_per_sec: finalTps,
          ttft: prev.ttft,
          total_latency: totalLatency,
          token_count: tokenCountRef.current,
        }),
      }).catch(console.error);

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
