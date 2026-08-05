# PAI SIM-LOOP — Simulation Loop on Cloudflare Free Tier

> Durable Object (state) + Workers AI (reflection) + Queues (async) + Cron (schedule)
>
> Runs AlphaPi-style loops: OBSERVE → REFLECT → EXECUTE → EVALUATE → RECORD → REPEAT
>
> **Total cost: $0/month**

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              SIMULATION LOOP                         │
│                                                      │
│  Cron Trigger (every 12h)                            │
│      ↓                                               │
│  Queue → runIteration()                              │
│      ↓                                               │
│  1. OBSERVE: Durable Object state                    │
│  2. REFLECT: Workers AI (llama-3.1-8b, free)        │
│  3. EXECUTE: Browser Run (10 min/day) OR V8 isolate │
│  4. EVALUATE: reward = f(result, expected)           │
│  5. RECORD: D1 insert + DO update                    │
│  6. REPEAT: Queue next iteration (max 10)           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Cloudflare Products Used

| Product | Free Tier | Role |
|:--------|:----------|:-----|
| Durable Objects | Free plan | Simulation state management |
| Workers AI | 10K Neurons/day | Reflection step (llama-3.1-8b) |
| Queues | 10K ops/day | Async iteration pipeline |
| Cron Triggers | 5 per account | Schedule simulation every 12h |
| D1 | 5M reads/day | Store simulation records |
| Browser Run | 10 min/day | Optional headless Chromium sandbox |

---

## Deploy (4 commands after token)

```bash
export CLOUDFLARE_API_TOKEN="your-token-here"
cd packages/sim-loop
npm run db:create      # D1: pai-sim-loop
npm run queue:create   # Queue: pai-sim-queue
npm run db:migrate     # Schema
npm run deploy         # Deploy Worker + DO + Cron
```

---

## API

| Method | Path | Purpose |
|:-------|:-----|:--------|
| POST | `/api/sim/start` | Start simulation with goal |
| GET | `/api/sim/state` | Get current simulation state |

---

## How It Works

1. **Cron fires every 12 hours** → queues first iteration
2. **Queue consumer** runs `runIteration()`:
   - Reads state from Durable Object
   - Calls Workers AI for reflection (what action to try?)
   - Executes action in Browser Run or V8 isolate
   - Computes reward
   - Records to D1 + updates DO
   - Queues next iteration (max 10 per cycle)
3. **Durable Object** maintains simulation state across iterations
4. **D1** stores all (action, result, reward) records for analysis

---

## Integration with AlphaPi

SIM-LOOP is the **runtime** for AlphaPi's loop engine. AlphaPi (`@pai/alphapi`) provides the interfaces (Observer, Reflector, Generator, Evaluator, Recorder). SIM-LOOP implements them on Cloudflare:

| AlphaPi Interface | SIM-LOOP Implementation |
|:-----------------|:------------------------|
| Observer | Durable Object state read |
| Reflector | Workers AI (llama-3.1-8b) |
| Generator | Workers AI (action generation) |
| Evaluator | V8 isolate / Browser Run |
| Recorder | D1 + Durable Object |
