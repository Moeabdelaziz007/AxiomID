/**
 * Emulate catch-all route — runs local API emulators on the same origin.
 * Solves Vercel preview deployment OAuth callback URL problems.
 *
 * Usage: npm install @emulators/adapter-next @emulators/github
 * Then set NEXT_PUBLIC_EMULATE_GITHUB=true to enable in dev.
 *
 * @see https://github.com/vercel-labs/emulate#nextjs-integration
 */
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

const handler = createEmulateHandler({ services });

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const PATCH = handler.PATCH;
export const DELETE = handler.DELETE;
