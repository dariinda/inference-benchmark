# InferBench — Local LLM Benchmarking Dashboard

A React dashboard to benchmark local LLMs (Ollama, LM Studio) in real time.
Measures **tokens/sec**, **time to first token (TTFT)**, **total latency**, and **token count** during streaming inference.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
# Open http://localhost:5173
```

## Prerequisites — Local LLM Running

### Ollama
```bash
# Install from https://ollama.com
ollama pull llama3.2
ollama serve   # Default: http://localhost:11434

# Allow CORS (required for browser)
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

### LM Studio
1. Download from https://lmstudio.ai
2. Load any model
3. Go to **Local Server** tab → **Start Server**
4. Default URL: `http://localhost:1234`

## Usage

1. Select your provider (Ollama or LM Studio)
2. Enter the base URL and model name
3. Type a prompt, set max tokens
4. Click **Run Benchmark** — metrics update live during streaming

## Version Control

```bash
git init
git add .
git commit -m "feat: initial benchmarking dashboard"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/inference-benchmark-dashboard.git
git branch -M main
git push -u origin main
```

## Project Structure

```
src/
├── App.jsx                    # Root: state management, streaming logic
├── components/
│   ├── BenchmarkRunner.jsx    # Config UI + streaming fetch (Ollama/LM Studio)
│   ├── MetricCards.jsx        # Live metric display cards
│   ├── TokenRateChart.jsx     # Chart.js line chart: tokens/sec over time
│   ├── LatencyTimeline.jsx    # TTFT vs generation breakdown bar
│   └── HistoryPanel.jsx       # Last 10 benchmark runs
└── index.css                  # Dark theme styles
```

## Branching Strategy

```
main          → stable releases
dev           → integration
feature/xxx   → individual features
```
