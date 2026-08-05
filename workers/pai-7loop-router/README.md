# ⚖️ PAI Al-Mizan Multi-Armed Bandit Router (Cloudflare Worker)

> **MIT Licensed · Open Source Reference Implementation**  
> *Feedback-driven self-improving LLM router powered by Epsilon-Greedy Bandit selection and Exponential Moving Average (EMA) performance updates.*

---

## 🔬 What Is Al-Mizan Router?

Al-Mizan (الميزان - *The Balance*) is a lightweight, edge-native model router designed to eliminate LLM over-spending. Instead of routing every request to expensive tier-1 models (like GPT-4o at $2.50/1M input), Al-Mizan routes tasks dynamically based on **prompt language, task type, latency, cost, and historical success rates**.

```
                           ┌───────────────────────────┐
                           │      Incoming Prompt      │
                           └─────────────┬─────────────┘
                                         │
                                         ▼
                           ┌───────────────────────────┐
                           │  1. Language & Task Class │
                           └─────────────┬─────────────┘
                                         │
                                         ▼
                           ┌───────────────────────────┐
                           │ 2. Multi-Objective Score  │
                           │   Cost, Latency, Strengths│
                           └─────────────┬─────────────┘
                                         │
                                         ▼
                           ┌───────────────────────────┐
                           │ 3. Epsilon-Greedy Select  │
                           │  90% Exploit / 10% Explore│
                           └─────────────┬─────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     ┌───────────────────────┐                       ┌───────────────────────┐
     │  DeepSeek V3 (CN)     │                       │  Cloudflare AI (US)   │
     │  $0.14/1M (450ms P50) │                       │  $0.00/1M (180ms P50) │
     └───────────────────────┘                       └───────────────────────┘
```

---

## ⚡ Key Features

- **Edge Native:** Runs on Cloudflare Workers with global sub-50ms routing overhead.
- **$\epsilon$-Greedy Bandit:** 90% exploitation of highest-performing model; 10% random exploration to discover new rate improvements.
- **EMA Weight Updates:** Smooth Exponential Moving Average updates ($\alpha = 0.10$) persisted in Cloudflare KV.
- **Zero-Cost Preflight Simulation:** Deterministic $O(n)$ pre-routing evaluation in $< 1\text{ms}$ with zero LLM API token overhead.
- **Multi-Region Aware:** Automatically prefers DeepSeek V3 ($0.14/1M) for Chinese (`zh`) tasks, G42 Jais 30B for Arabic (`ar`), and Cloudflare Workers AI for free-tier general execution ($0.00/1M).

---

## 🚀 Quick Start & Self-Verification

### 1. Clone & Run Local Worker
```bash
git clone https://github.com/pai-list/AxiomID.git
cd AxiomID/workers/pai-7loop-router
npm install
npm run dev
```

### 2. Run the 20-Test Validation Suite
```bash
node test_live.mjs
```

### 3. Run 100+ Observations KV Persistence Verification
```bash
node seed_100_observations.mjs
```

---

## 📡 REST API Reference

### `POST /route`
Selects the optimal provider for a given prompt.

**Request:**
```json
{
  "prompt": "Write a TypeScript fibonacci function"
}
```

**Response (HTTP 200):**
```json
{
  "ok": true,
  "provider": "deepseek",
  "model": "deepseek-chat",
  "isExploration": false,
  "estimatedLatencyMs": 450,
  "estimatedCostPer1M": 0.14,
  "language": "en",
  "epsilon": 0.1
}
```

---

### `POST /feedback`
Records actual inference latency, cost, and success rate to update live KV weights.

**Request:**
```json
{
  "timestamp": 1774200000000,
  "provider": "deepseek",
  "model": "deepseek-chat",
  "latencyMs": 450,
  "costPer1M": 0.14,
  "success": true,
  "userRating": 5
}
```

**Response (HTTP 200):**
```json
{
  "ok": true,
  "recorded": true
}
```

---

### `GET /weights`
Inspects current multi-armed bandit state and live weights in Cloudflare KV.

**Response (HTTP 200):**
```json
{
  "weights": {
    "deepseek:deepseek-chat": 0.9530,
    "cloudflare:@cf/meta/llama-3.1-8b-instruct": 0.9420,
    "together:meta-llama/Llama-3.1-70B-Instruct-Turbo": 0.8821,
    "openrouter:openai/gpt-4o": 0.3471
  },
  "epsilon": 0.1,
  "totalObservations": 210
}
```

---

## 📄 License

MIT License © 2026 PAI Foundation / Mohamed Abdelaziz. Free for community verification, open-source integration, and commercial modification.
