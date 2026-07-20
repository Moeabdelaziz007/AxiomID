# @pai/atom

THE ATOM. 50 lines. Frozen forever. Everything composes on this.

```typescript
export interface PaiSkill<TIn, TOut> {
  name: string;
  version: string;
  execute(input: TIn, ctx: SkillContext): Promise<TOut>;
  validateInput(input: TIn): boolean;
  metadata: {
    price: number;
    permissions: string[];
    acp: { agentId: string };
    sandbox: "wasm" | "js" | "native";
  };
}
```

**v1 = final. v2 = new name. Never changes.**

This is the ABI of the agent economy — the same way USB descriptors compress hardware identity, PaiSkill compresses agent capability.
