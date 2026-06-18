"use client";

import { Renderer } from "@json-render/react";
import { registry } from "@/lib/registry";
import React from "react";

interface AxiomRendererProps {
  spec: any;
}

export function AxiomRenderer({ spec }: AxiomRendererProps) {
  return <Renderer spec={spec} registry={registry} />;
}
