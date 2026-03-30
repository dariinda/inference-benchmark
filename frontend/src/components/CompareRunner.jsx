import { useState, useRef } from "react";
import MetricCards from "./MetricCards";
import TokenRateChart from "./TokenRateChart";

const EMPTY_METRICS = {
  ttft: null,
  tokensPerSec: null,
  totalLatency: null,
  tokenCount: 0,
  snapshots: [],
  output: "",
  status: "idle",
};

const BACKEND_URL = "http://localhost:8000";

export default function CompareRunner() {
  const [modelA, setModelA] = useState("");
  const [modelB, setModelB] = useState("");
  const [prompt, setPrompt] = useState(
    "Explain the theory of relativity in detail."
  );
  const [maxTokens, setMaxTokens] = useState(256);
  const [metricsA, setMetricsA] = useState(EMPTY_METRICS);
  const [metricsB, setMetricsB] = useState(EMPTY_METRICS);
  const [running, setRunning] = useState(false);

  const runModel = async (model, setMetrics) => {
    const startTime = performance.now();
    let firstTokenTime = null;
    let tokenCount = 0;
    let output = "";

    setMetrics({ ...EMPTY_METRICS, status: "running" });

    const response = await fetch(`${BACKEND_URL}/inference/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        max_tokens: maxTokens,
        provider: "ollama",
        base_url: "http://localhost:11434",
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value, { stream: true }).split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;

        const jsonStr = trimmed.startsWith("data: ")
          ? trimmed.slice(6)
          : trimmed;

        try {
          const obj = JSON.parse(jsonStr);
          console.log("raw line:", jsonStr.slice(0, 200));
          console.log(
            "qwen obj keys:",
            Object.keys(obj),
            "full:",
            JSON.stringify(obj).slice(0, 200)
          );

          const chunk = (obj.thinking || obj.response) ?? "";

          if (chunk) {
            const now = performance.now();
            if (!firstTokenTime) firstTokenTime = now;
            tokenCount += 1;
            output += chunk;
            const elapsed = now - startTime;
            const tps = parseFloat(((tokenCount / elapsed) * 1000).toFixed(1));

            setMetrics((prev) => ({
              ...prev,
              ttft: Math.round(firstTokenTime - startTime),
              tokensPerSec: tps,
              tokenCount,
              output,
              snapshots: [...prev.snapshots, { t: Math.round(elapsed), tps }],
            }));
          }

          if (obj.done) {
            const totalLatency = Math.round(performance.now() - startTime);
            setMetrics((prev) => ({
              ...prev,
              totalLatency,
              tokensPerSec: parseFloat(
                ((tokenCount / totalLatency) * 1000).toFixed(1)
              ),
              status: "done",
            }));
            return;
          }
        } catch {}
      }
    }
  };

  const handleCompare = async () => {
    if (!modelA.trim() || !modelB.trim()) return;
    setRunning(true);
    setMetricsA(EMPTY_METRICS);
    setMetricsB(EMPTY_METRICS);

    try {
      console.log("Starting Model A:", modelA);
      await runModel(modelA, setMetricsA);
      console.log("Model A done, starting Model B:", modelB);
      await runModel(modelB, setMetricsB);
      console.log("Model B done");
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="compare-wrapper">
      <div className="card compare-config">
        <div className="section-label">Compare Models</div>
        <div className="compare-inputs">
          <div className="field">
            <label className="field-label">Model A</label>
            <input
              className="field-input"
              value={modelA}
              onChange={(e) => setModelA(e.target.value)}
              placeholder="gemma3:4b"
              disabled={running}
            />
          </div>
          <div className="compare-vs">vs</div>
          <div className="field">
            <label className="field-label">Model B</label>
            <input
              className="field-input"
              value={modelB}
              onChange={(e) => setModelB(e.target.value)}
              placeholder="qwen3:8b"
              disabled={running}
            />
          </div>
        </div>
        <div className="field" style={{ marginTop: "10px" }}>
          <label className="field-label">Prompt</label>
          <textarea
            className="field-input field-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={running}
            rows={2}
          />
        </div>
        <div className="field" style={{ marginTop: "10px" }}>
          <label className="field-label">
            Max Tokens: <strong>{maxTokens}</strong>
          </label>
          <input
            type="range"
            min={64}
            max={2048}
            step={64}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            disabled={running}
          />
        </div>
        <button
          className={`run-btn ${running ? "stop" : "start"}`}
          style={{ marginTop: "12px" }}
          onClick={handleCompare}
          disabled={running}
        >
          {running ? "⏳ Running comparison…" : "▶ Compare Models"}
        </button>
      </div>

      <div className="compare-results">
        <div className="compare-side">
          <div className="compare-model-label">{modelA || "Model A"}</div>
          <MetricCards metrics={metricsA} />
          <TokenRateChart
            snapshots={metricsA.snapshots}
            status={metricsA.status}
          />
          {metricsA.output && (
            <div className="output-box">
              <div className="section-label">Output</div>
              <pre className="output-text">{metricsA.output}</pre>
            </div>
          )}
        </div>
        <div className="compare-side">
          <div className="compare-model-label">{modelB || "Model B"}</div>
          <MetricCards metrics={metricsB} />
          <TokenRateChart
            snapshots={metricsB.snapshots}
            status={metricsB.status}
          />
          {metricsB.output && (
            <div className="output-box">
              <div className="section-label">Output</div>
              <pre className="output-text">{metricsB.output}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
