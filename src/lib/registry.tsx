"use client";

import { defineRegistry } from "@json-render/react";
import { axiomCatalog } from "./catalog";
import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Fingerprint, ClipboardCopy, ArrowRight } from "lucide-react";

type LinkIcon = "fingerprint" | "clipboard" | "none";
type LinkColor = "neon-green" | "electric-blue" | "default";

type LinkItemProps = {
  label: string;
  href: string;
  icon?: LinkIcon;
  color?: LinkColor;
};

const LINK_ICONS: Record<LinkIcon, React.ReactNode> = {
  fingerprint: <Fingerprint className="w-4 h-4" />,
  clipboard: <ClipboardCopy className="w-4 h-4" />,
  none: null,
};

const LINK_COLORS: Record<LinkColor, string> = {
  "neon-green": "hover:text-neon-green hover:border-neon-green/30",
  "electric-blue": "hover:text-electric-blue hover:border-electric-blue/30",
  default: "",
};

const components = {
  Card: ({ props, children }: { props: { title?: string }; children?: React.ReactNode }) => (
    <div className="p-4 border rounded shadow-sm bg-white dark:bg-gray-800">
      {props.title && <h3 className="text-sm font-semibold mb-4">{props.title}</h3>}
      {children && <div className="space-y-2">{children}</div>}
    </div>
  ),
  LinkItem: ({ props }: { props: LinkItemProps }) => {
    const icon = LINK_ICONS[props.icon ?? "none"];
    const colorClass = LINK_COLORS[props.color ?? "default"];
    return (
      // href is a runtime-generated string from the JSON spec, so it cannot be
      // statically verified against typedRoutes — cast to Route at this boundary.
      <Link
        href={props.href as Route}
        className={`flex items-center justify-between p-3 rounded-xl border transition-colors group hover:bg-gray-100 dark:hover:bg-gray-700 ${colorClass}`}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="group-hover:scale-110 transition-transform">{icon}</span>
          )}
          <span className="text-sm transition-colors">{props.label}</span>
        </div>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
      </Link>
    );
  },
  Heading: ({ props }: { props: { text: string; level?: "h1" | "h2" | "h3" } }) => {
    const Tag = props.level || "h2";
    return <Tag className="text-xl font-bold">{props.text}</Tag>;
  },
  Button: ({ props, actions }: { props: { label: string; action?: string }; actions?: Record<string, () => void> }) => (
    <button 
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      onClick={props.action && actions?.[props.action] ? () => actions[props.action!]() : undefined}
    >
      {props.label}
    </button>
  ),
  Metric: ({ props }: { props: { label: string; value: string } }) => (
    <div className="p-2">
      <div className="text-sm text-gray-500">{props.label}</div>
      <div className="text-2xl font-bold">{props.value}</div>
    </div>
  ),
};

const actions = {
  // A full reload is intentional here: this actions map is a plain object, not a
  // React component, so the next/navigation router hook (router.refresh()) is not
  // available. window.location.reload() guarantees a fresh server fetch.
  refresh_data: async () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  },
};

export const { registry } = defineRegistry(axiomCatalog, { components, actions });
