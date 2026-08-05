# Cloudflare Free Tier — Complete Audit & Creative Integration Plan
> Verified: 2026-07-20 via Cloudflare docs (developers.cloudflare.com)
> Account: AxiomID (axiomid.app) | Realtime App ID: 1f47281c137228080f78f94ec98a9d07

---

## Part 1: Current State — USED vs UNUSED (8 of 21 features)

### ✅ USED (8 features)

| Feature | Binding | What It Does for AxiomID |
|:-------|:--------|:-------------------------|
| **Workers** | `axiomid-backend` | API backend, edge functions |
| **D1** | `axiomid-edge`, `truth-db` | Edge SQLite databases |
| **KV** | `CACHE_KV`, `DB`, `TRUTH_DB`, `AI`, `SEARCH_VECTORS`, `HARVEST_QUEUE` | 6 KV namespaces for caching/config |
| **Vectorize** | `axiomid-truth` | Vector search for agent discovery |
| **Workers AI** | `AI` binding | 10K Neurons/day free — currently underutilized |
| **Durable Objects** | `PresenceDO` | Real-time presence coordination |
| **Email Routing** | wrangler-email-router.toml | Catch-all agents.axiomid.app → Worker |
| **Queues** | `HARVEST_QUEUE` | Async task queue |

### ⬜ UNUSED (13 features — $0 value being left on the table)

| Feature | Free Tier | Why It Matters for AxiomID/AlphaPi |
|:-------|:----------|:----------------------------------|
| **R2** | 10GB, zero egress | Store passport images, agent avatars, TrustChain archives — **zero bandwidth cost** |
| **Cron Triggers** | 5 per account | Run AlphaPi loop every 12h automatically |
| **Workflows** | 100K req/day, 3K steps/day, 1GB | **Durable AlphaPi loop with retries + pause/resume** — the missing piece! |
| **Hyperdrive** | — | Cache Postgres queries (Vercel Postgres) |
| **AI Gateway** | Free | **Cache + rate-limit + log ALL LLM calls** (OpenAI, Anthropic, DeepSeek) — cost saver |
| **AI Search** | 20K queries/month, 100K files | Semantic search over AxiomID docs/skills — free RAG |
| **Pages** | Unlimited static | Could host PAI docs site (docs.pai.build) |
| **Images** | Free transformations | Optimize passport/QR images at edge |
| **Stream** | Delivery included | Agent verification videos, tutorials |
| **Turnstile** | Free, no CAPTCHA | Bot protection for Pi KYC flow — invisible to humans |
| **Zero Trust** | 50 users free | Protect admin/dashboard with identity-aware proxy |
| **WAF** | Managed rules free | Block attacks on API routes |
| **Pipelines** | 1GB/month | Stream TrustChain events to R2/Iceberg |

### 🆕 NEW: Cloudflare Realtime (SFU + TURN + RealtimeKit)

| Component | Free Tier | What It Does |
|:---------|:----------|:------------|
| **Realtime SFU** | **1,000 GB egress FREE** ($0.05/GB after) | WebRTC Selective Forwarding Unit — route video/audio at edge |
| **TURN Service** | Included in 1,000 GB free | NAT traversal for peer-to-peer WebRTC |
| **RealtimeKit** | SDKs: React, Flutter, Android, iOS | Full meeting/video UI Kit with recording, chat, polls, watermarking |

**RealtimeKit features (verified from docs):**
- Meeting presets, participant sessions, lifecycle management
- UI Kit: Component Library (GridView, HeaderView, ControlBar, Chat, Polls, AudioDeviceSelector)
- Recording: Track recording, custom recording app, interactive recordings with timed metadata
- Upload to R2 Bucket (connects R2 + Realtime!)
- Branding: custom icons, design tokens
- Powered by WebRTC, built on Realtime SFU

---

## Part 2: Creative Integration — AlphaPi × Cloudflare × RealtimeKit

### Idea 1: AlphaPi Loop as Cloudflare Workflow (HIGH PRIORITY)

**Problem:** AlphaPi loop needs to be durable — if a step fails, it should retry. If the Worker restarts, state should persist.

**Solution:** Use Cloudflare Workflows (FREE, 3K steps/day):

```typescript
// AlphaPi as a Cloudflare Workflow
export class AlphaPiWorkflow extends WorkflowEntrypoint {
  async run(event: LoopConfig, step: Step) {
    // Step 1: OBSERVE (retryable, persists state)
    const state = await step.do('observe', async () => {
      return await this.observe(event.target);
    });

    // Step 2: REFLECT (can pause for external approval)
    const reflection = await step.do('reflect', async () => {
      return await this.reflect(state, event.goal);
    });

    // Step 3: GENERATE
    const candidates = await step.do('generate', async () => {
      return await this.generate(reflection, state, 3);
    });

    // Step 4: EVALUATE (parallel candidates)
    const evaluations = await Promise.all(
      candidates.map(c => step.do(`eval-${c.id}`, async () => {
        return await this.evaluate(c, state);
      }))
    );

    // Step 5: SELECT
    const selected = await step.do('select', async () => {
      return this.selectBest(evaluations);
    });

    // Step 6: RECORD to TrustChain (D1)
    await step.do('record', async () => {
      await this.recordToTrustChain(selected);
    });

    // Step 7: REPEAT or stop
    if (selected.reward > 0.01) {
      await step.sleep('wait before next iteration', '30 seconds');
      // Recursive: trigger next iteration
    }
  }
}
```

**Why this is smart:**
- Workflows retry failed steps automatically (no manual retry logic)
- State persists between steps (no lost work on restart)
- Can pause for human approval (`step.sleep` or `step.waitForEvent`)
- 3,000 steps/day free = ~430 AlphaPi iterations/day (7 steps each)

### Idea 2: AI Gateway for All LLM Calls (COST SAVER)

**Problem:** AlphaPi calls LLMs for reflection + generation + review. These cost money.

**Solution:** Route ALL LLM calls through Cloudflare AI Gateway (FREE):

```
AlphaPi → AI Gateway → DeepSeek/Gemini/Claude
         ↓
    Cache (same prompt = free response)
    Rate limit (prevent runaway costs)
    Log every call (audit trail)
    Analytics (which LLM is most effective?)
```

**Creative twist:** AI Gateway supports **model fallback** — if DeepSeek is down, automatically use GLM. If GLM is down, use Workers AI (Kimi K2.7, free 10K Neurons/day). This gives AlphaPi **multi-LLM resilience** at zero infrastructure cost.

**Supported providers (verified from docs):**
Workers AI, Amazon Bedrock, Anthropic, Azure OpenAI, Baseten, Cartesia, Cerebras, Cohere, Deepgram, **DeepSeek**, ElevenLabs, Fal AI, Google AI Studio, Google Vertex, Groq, Hugging Face, Mistral, OctoAI, OpenAI, Perplexity, Replicate, Together AI

### Idea 3: RealtimeKit for "Agent Verification Video Call" (NOVEL)

**Concept:** When a Pi user wants highest trust level (Sovereign tier), they do a **live video verification call** — not just KYC document upload.

**Flow:**
1. User clicks "Sovereign Verification" → RealtimeKit creates a meeting
2. User joins via Pi Browser (RealtimeKit has React SDK)
3. AI agent asks dynamic questions (proof of personhood)
4. Session recorded → uploaded to R2 (zero egress cost)
5. TrustChain records: "video verification completed, hash: 0x..."
6. Recording can be re-verified by other agents via Stream

**Why this is novel:** No identity system uses live video verification via edge WebRTC. Traditional KYC = document upload. AxiomID = live AI-driven verification at the edge, 1,000 GB free.

### Idea 4: Cron Triggers for Automated AlphaPi Cycles

**Setup:** 5 free Cron Triggers → run AlphaPi every 12 hours:

```toml
# wrangler.toml
[triggers]
crons = ["0 */12 * * *"]  # Every 12 hours
```

The Cron Trigger starts the AlphaPi Workflow, which runs the full 7-step loop. Zero cost, fully automated.

### Idea 5: R2 for Passport Assets + TrustChain Archive

**Problem:** Passports need images (QR, avatar, badges). TrustChain needs long-term archive.

**Solution:** R2 bucket (10GB free, zero egress):

```
r2://axiomid-assets/
  ├── passports/{did}/qr.png
  ├── passports/{did}/avatar.png
  ├── passports/{did}/badges/
  └── trustchain/
      ├── 2026-07/
      │   ├── week-29.jsonl
      │   └── week-30.jsonl
      └── alpha-pi/
          └── loop-records-{date}.jsonl
```

**Zero egress = serving passport images is free forever.**

### Idea 6: Turnstile for Pi KYC Bot Protection

**Problem:** Pi KYC flow could be attacked by bots pretending to be humans.

**Solution:** Cloudflare Turnstile (free, invisible):

```tsx
import { Turnstile } from "@marsidev/react-turnstile";

<Turnstile
  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_KEY}
  onSuccess={(token) => verifyBotToken(token)}
/>
```

Invisible to real users (no CAPTCHA puzzles), blocks bots. Pairs perfectly with Pi Network's human verification — double layer: Pi KYC (human) + Turnstile (not bot).

### Idea 7: AI Search for Agent Discovery (FREE RAG)

**Problem:** Finding the right agent/skill in AxiomID marketplace requires keyword search. Semantic search is better.

**Solution:** Cloudflare AI Search (20K queries/month, 100K files — free during beta):

- Index all 22 ACP offerings
- Index all PAI skills
- Index all docs
- Semantic search: "I need to verify someone's identity" → returns KYA + PiVerify + TrustScore

**Replaces or supplements Vectorize** — AI Search is managed, no need to maintain embeddings.

---

## Part 3: Priority Matrix — What to Build First

| Priority | Feature | Effort | Impact | Why |
|:---------|:--------|:------|:-------|:----|
| **P0** | Workflows (AlphaPi loop) | Medium | Critical | AlphaPi needs durability — this is the backbone |
| **P0** | AI Gateway (LLM routing) | Low | High | Cost savings + resilience for all LLM calls |
| **P1** | Cron Triggers | Low | High | Automate AlphaPi every 12h — zero cost |
| **P1** | R2 (assets + archive) | Low | High | Free image storage, zero egress |
| **P1** | Turnstile (KYC protection) | Low | Medium | Bot protection for free |
| **P2** | RealtimeKit (video KYC) | High | Novel | Sovereign-tier live verification — unique moat |
| **P2** | AI Search (agent discovery) | Medium | Medium | Better marketplace search |
| **P3** | Images (optimization) | Low | Low | Nice-to-have for passport images |
| **P3** | Zero Trust (admin protect) | Low | Medium | Good security practice |
| **P3** | Stream (video tutorials) | Low | Low | Nice-to-have |
| **P3** | Pipelines (event streaming) | Medium | Low | TrustChain → R2 streaming |

---

## Part 4: Workers AI Model Catalog (verified 2026-07-20)

Key models available via `AI` binding (10K Neurons/day free):

| Model | Type | Why It Matters for AlphaPi |
|:------|:-----|:--------------------------|
| **Kimi K2.7** | Text gen, 1T params, 262K context | Chinese LLM — bridge US↔China, long context for TrustChain analysis |
| **PLaMo-Embedding-1B** | Japanese text embeddings | Multi-language embeddings for agent discovery |
| **DeepSeek** (via AI Gateway) | Text gen, 1/10 GPT-4 cost | AlphaPi reflection + generation |
| **GLM** (via AI Gateway) | Text gen, bilingual | AlphaPi reflection in Chinese |
| **Standard text models** | Various sizes | Reflection, generation, review |

**Creative idea:** Use Kimi K2.7 (free via Workers AI) for AlphaPi's reflection step. 262K context = can analyze entire TrustChain history in one call. 1T parameters = strong reasoning. Zero cost.

---

## Part 5: Cost Analysis — Everything Free

| Feature | Free Allowance | AxiomID Usage Estimate | Cost |
|:--------|:--------------|:----------------------|:-----|
| Workers | 100K req/day | ~5K req/day | $0 |
| D1 | 5M reads, 100K writes/day | ~50K reads/day | $0 |
| KV | Free plan | 6 namespaces | $0 |
| Vectorize | 30M dims/month | ~100K dims | $0 |
| Workers AI | 10K Neurons/day | ~1K Neurons/day | $0 |
| Workflows | 3K steps/day | ~500 steps/day | $0 |
| AI Gateway | Free | All LLM calls | $0 |
| R2 | 10GB, zero egress | ~2GB | $0 |
| Realtime SFU | 1,000 GB | ~10GB (video KYC) | $0 |
| Cron Triggers | 5 | 1-2 | $0 |
| Email Routing | Free | Catch-all | $0 |
| Turnstile | Free | KYC flow | $0 |
| AI Search | 20K queries/month | ~1K queries | $0 |
| **TOTAL** | — | — | **$0/month** |

**The entire AxiomID infrastructure runs on Cloudflare's free tier.** The only cost is the Vercel deployment (also has free tier) and LLM API calls (mitigated by AI Gateway caching + Workers AI free Neurons).

---

## Sources (all fetched 2026-07-20)

- Cloudflare Realtime overview: developers.cloudflare.com/realtime/
- RealtimeKit: developers.cloudflare.com/realtime/realtimekit/
- SFU pricing: developers.cloudflare.com/realtime/sfu/pricing/ — "1,000 GB free"
- Workers AI models: developers.cloudflare.com/workers-ai/models/ — Kimi K2.7, PLaMo-Embedding-1B
- AI Gateway: developers.cloudflare.com/ai-gateway/ — supports DeepSeek, Anthropic, OpenAI, Workers AI
- Workflows: developers.cloudflare.com/workflows/ — "Available on Free and Paid plans"
