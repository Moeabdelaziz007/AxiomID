/**
 * Emulate catch-all route — runs local API emulators on the same origin.
 * Solves Vercel preview deployment OAuth callback URL problems.
 *
 * Usage: npm install @emulators/adapter-next @emulators/github
 * Then set NEXT_PUBLIC_EMULATE_GITHUB=true to enable in dev.
 *
 * @see https://github.com/vercel-labs/emulate#nextjs-integration
 */
import { NextResponse } from "next/server";
import { createEmulateHandler } from "@emulators/adapter-next";
import * as github from "@emulators/github";

const services: Record<string, { emulator: typeof github; seed?: Record<string, unknown> }> = {};

if (process.env.NEXT_PUBLIC_EMULATE_GITHUB === "true") {
  services.github = {
    emulator: github,
    seed: {
      users: [{ login: "axiomid-dev", name: "AxiomID Dev", email: "dev@axiomid.app" }],
      repos: [{ owner: "axiomid-dev", name: "hello-world", auto_init: true }],
    },
  };
}

// Never expose the emulator surface in production. The emulator route is a
// dev/preview-only tool; in production every method returns 404.
import { NextResponse } from "next/server";
import { apiError } from "`@/lib/errors`";

const notFound = () =>
  apiError("NOT_FOUND", "Not found");

const handler =
const isProdDeployment =
  process.env.VERCEL_ENV === "production";

const handler =
  isProdDeployment
    ? { GET: notFound, POST: notFound, PUT: notFound, PATCH: notFound, DELETE: notFound }
    : createEmulateHandler({ services });

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const PATCH = handler.PATCH;
export const DELETE = handler.DELETE;
