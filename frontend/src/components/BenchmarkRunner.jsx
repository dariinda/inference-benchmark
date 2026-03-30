import { useState } from "react";

const PROVIDERS = [
  { id: "ollama", label: "Ollama", defaultUrl: "http://localhost:11434" },
  { id: "lmstudio", label: "LM Studio", defaultUrl: "http://localhost:1234" },
];

export default function BenchmarkRunner({
  onStart,
  onToken,
  onEnd,
  onError,
  status,
}) {
  const [provider, setProvider] = useState("ollama");
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState(
    "Explain the theory of relativity in detail."
  );
  const [maxTokens, setMaxTokens] = useState(256);
  const abortRef = { current: null };

  const running = status === "running";

  const handleProviderChange = (id) => {
    setProvider(id);
    const p = PROVIDERS.find((p) => p.id === id);
    setBaseUrl(p.defaultUrl);
  };

  const BACKEND_URL = "http://localhost:8000";

  const runBenchmark = async () => {
    if (!model.trim()) {
      onError("Please enter a model name.");
      return;
    }
    onStart();

    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const response = await fetch(`${BACKEND_URL}/inference/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          max_tokens: maxTokens,
          provider,
          base_url: baseUrl,
        }),
        signal: ctrl.signal,
      });

      if (!response.ok) {
        const txt = await response.text();
        onError(`HTTP ${response.status}: ${txt}`);
        return;
      }

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
            let chunk = "";

            if (provider === "ollama") {
              chunk = obj.response ?? "";
              if (chunk) onToken(chunk);
              if (obj.done) {
                onEnd({ provider, model, baseUrl, prompt, maxTokens });
                return;
              }
            } else {
              chunk = obj.choices?.[0]?.delta?.content ?? "";
              if (chunk) onToken(chunk);
              if (obj.choices?.[0]?.finish_reason) {
                onEnd({ provider, model, baseUrl, prompt, maxTokens });
                return;
              }
            }
          } catch {}
        }
      }

      onEnd({ provider, model, baseUrl, prompt, maxTokens });
    } catch (err) {
      if (err.name !== "AbortError")
        onError(`Connection error: ${err.message}`);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="card runner-card">
      <div className="section-label">Benchmark Configuration</div>

      <div className="provider-tabs">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            className={`tab-btn ${provider === p.id ? "active" : ""}`}
            onClick={() => handleProviderChange(p.id)}
            disabled={running}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <div className="field">
          <label className="field-label">Base URL</label>
          <input
            className="field-input"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            disabled={running}
            placeholder="http://localhost:11434"
          />
        </div>

        <div className="field">
          <label className="field-label">Model Name</label>
          <input
            className="field-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={running}
            placeholder={
              provider === "ollama" ? "llama3.2, mistral…" : "model-identifier"
            }
          />
        </div>

        <div className="field full-width">
          <label className="field-label">Prompt</label>
          <textarea
            className="field-input field-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={running}
            rows={3}
          />
        </div>

        <div className="field">
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
      </div>

      <div className="runner-actions">
        <button
          className={`run-btn ${running ? "stop" : "start"}`}
          onClick={running ? handleStop : runBenchmark}
        >
          {running ? "■ Stop" : "▶ Run Benchmark"}
        </button>
        <span className={`status-badge status-${status}`}>
          {status === "idle" && "Ready"}
          {status === "running" && "Streaming…"}
          {status === "done" && "Complete"}
          {status === "error" && "Error"}
        </span>
      </div>
    </div>
  );
}
