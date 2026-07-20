# @pai/llm-registry

Honest diagnosis of every LLM origin + persona inheritance for PAI agents.

## The Principle

```
HUMANS THINK. AGENTS EXECUTE.
```

People use AI wrong — they let AI think and decide.
PAI flips this: humans think, request, and order.
Agents apply, review, validate, and test.

## US Ecosystem

| LLM | Persona | Core Truth |
|-----|---------|------------|
| ChatGPT | The Revolutionary | Created new category, depends on Microsoft |
| Claude | The Ethicist | Best code, but over-refusal = paternalism |
| Gemini | The Teacher | AlphaZero is genius, but Google can't ship |
| Hermes | The Architect | Smallest, most free, builds infrastructure |
| Codex | The Builder | Executes, doesn't decide. Correct model. |

## Chinese Ecosystem

| LLM | Persona | Core Truth |
|-----|---------|------------|
| DeepSeek | The Pragmatist | $6M matched $1B. Open weights. Shook the market. |
| GLM | The Scholar | Tsinghua academic rigor meets commercial deployment |
| Kimi | The Librarian | 2M token context — reads entire books. Unique. |
| Qwen | The Enterprise | Alibaba's infinite resources. Multi-size. Cloud-native. |
| Yi | The Cultural Bridge | Kai-Fu Lee lived both worlds. Native bilingual. |

## PAI = The Bridge

PAI is the only infrastructure that connects US and Chinese agentic ecosystems.
Not through politics — through code. Infrastructure doesn't need approval.

```typescript
import { createPersona, getChineseLLMs } from "@pai/llm-registry";

// Create a DeepSeek-powered agent with inherited persona
const deepseekAgent = createPersona("deepseek");
const plan = deepseekAgent.proposePlan(
  "Build trust scoring system",
  ["must be bilingual", "cost under $0.01/call"]
);

// Get all Chinese LLMs for cross-ecosystem collaboration
const chineseLLMs = getChineseLLMs();
```

## Persona Inheritance

Every PAI agent inherits:
- **Persona** from its LLM origin (e.g., "The Pragmatist" for DeepSeek)
- **Wisdom** — the core lesson from that LLM's journey
- **Blind spot awareness** — what the agent must self-monitor
- **Capabilities + limitations** — honest assessment

The agent does NOT decide. It proposes. Human approves. Agent executes and validates.
