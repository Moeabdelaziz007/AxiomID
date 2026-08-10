"use client";

// agent-bus: minimal typed pub/sub for Aura OS windows. No persistence, no
// networking — agents live in one browser session (ponytail: add real
// cross-agent transport when agents run server-side, then reuse this API).

type Handler<T> = (payload: T) => void;

const listeners = new Map<string, Set<Handler<unknown>>>();
const log: { type: string; payload: unknown; at: string }[] = [];

export function on<T>(type: string, handler: Handler<T>): () => void {
  let set = listeners.get(type);
  if (!set) {
    set = new Set();
    listeners.set(type, set);
  }
  set.add(handler as Handler<unknown>);
  return () => {
    set!.delete(handler as Handler<unknown>);
    if (set!.size === 0) listeners.delete(type);
  };
}

export function emit<T>(type: string, payload?: T): void {
  log.push({ type, payload, at: new Date().toISOString() });
  if (log.length > 100) log.shift();
  listeners.get(type)?.forEach((h) => h(payload));
}

/** Last 100 emitted events — for the OS transparency ticker / debugging. */
export function busHistory(): { type: string; payload: unknown; at: string }[] {
  return [...log];
}

export const BUS_EVENTS = {
  googleConnected: "agent.connected.google",
  piConnected: "agent.connected.pi",
  shieldAlert: "shield.alert",
} as const;