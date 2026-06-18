import { Renderer, JSONUIProvider, VisibilityProvider } from "@json-render/react";
import { registry } from "@/lib/registry";
import React from "react";

interface AxiomRendererProps {
  spec: unknown;
}

export function AxiomRenderer({ spec }: AxiomRendererProps) {
  // Renderer relies on context from JSONUIProvider + VisibilityProvider. Provide
  // them here so every AxiomRenderer caller works without each layout having to
  // wrap the tree itself (the production layouts do not).
  return (
    <JSONUIProvider registry={registry}>
      <VisibilityProvider>
        {/* The public prop is `unknown` for caller flexibility; cast to the exact
            spec type that Renderer expects at this boundary. */}
        <Renderer spec={spec as React.ComponentProps<typeof Renderer>["spec"]} registry={registry} />
      </VisibilityProvider>
    </JSONUIProvider>
  );
}
