# @pai/reputation

TrustChain + Eigenvector reputation for AI agents.

```typescript
import { TrustChain, EigenvectorReputation, calculateTrustScore } from "@pai/reputation";

// 1. Record agent actions in an append-only hash chain
const chain = new TrustChain();
await chain.append("did:agent:0x742d...", "verify-human", "onboarding");

// 2. Compute reputation via eigenvector centrality (PageRank for agents)
const rep = new EigenvectorReputation();
rep.addInteraction("did:agent:0xa...", "did:agent:0xb...", 5);
const score = rep.scoreFor("did:agent:0xb..."); // 0-100

// 3. Calculate full trust score with breakdown
const trust = calculateTrustScore(85, 70, 60, 55);
console.log(trust.level); // "good"
```

Part of PAI Identity Primitive (AxiomID → PAI).
