# @pai/identity-did

W3C DID method for AI agents — `did:agent`.

```typescript
import { createDID, resolveDID } from "@pai/identity-did";

const { did, document } = await createDID({
  controller: "did:pai:founder",
  publicKey: "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  services: [
    { type: "AgentMCPServer", serviceEndpoint: "https://mcp.pai.build/agent/0x742d..." },
    { type: "ACPCommerce", serviceEndpoint: "https://acp.virtuals.io/agent/0x742d..." },
  ],
});

const result = await resolveDID(did);
```

Part of PAI Identity Primitive (AxiomID → PAI).
