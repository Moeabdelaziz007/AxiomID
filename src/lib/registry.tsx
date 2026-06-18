"use client";

import { defineRegistry } from "@json-render/react";
import { axiomCatalog } from "./catalog";
import React from "react";
import Link from "next/link";
import type { Route } from "next";

type LinkItemProps = { label: string; href: string };

const components = {
  Card: ({ props, children }: { props: { title?: string }; children?: React.ReactNode }) => (
    <div className="p-4 border rounded shadow-sm bg-white dark:bg-gray-800">
      {props.title && <h3 className="text-sm font-semibold mb-4">{props.title}</h3>}
      {children && <div className="space-y-2">{children}</div>}
    </div>
  ),
  LinkItem: ({ props }: { props: LinkItemProps }) => (
    // href is a runtime-generated string from the JSON spec, so it cannot be
    // statically verified against typedRoutes — cast to Route at this boundary.
    <Link href={props.href as Route} className="flex items-center justify-between p-3 rounded-xl border hover:bg-gray-100 dark:hover:bg-gray-700">
      <span className="text-sm">{props.label}</span>
    </Link>
  ),
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
  refresh_data: async () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  },
};

export const { registry } = defineRegistry(axiomCatalog, { components, actions });
