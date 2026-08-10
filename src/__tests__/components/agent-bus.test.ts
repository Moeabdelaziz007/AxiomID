/**
 * @jest-environment node
 */

import { on, emit, busHistory, BUS_EVENTS } from "@/components/os/agent-bus";

describe("agent-bus", () => {
  it("delivers events to subscribers and cleans up on unsubscribe", () => {
    const received: unknown[] = [];
    const off = on<string>(BUS_EVENTS.shieldAlert, (p) => received.push(p));

    emit(BUS_EVENTS.shieldAlert, "suspicious login");
    expect(received).toEqual(["suspicious login"]);

    off();
    emit(BUS_EVENTS.shieldAlert, "ignored");
    expect(received).toEqual(["suspicious login"]);
  });

  it("keeps a rolling history of the last 100 events", () => {
    for (let i = 0; i < 105; i++) emit("tick", i);
    const history = busHistory();
    expect(history.length).toBe(100);
    expect(history[0].payload).toBe(5);
    expect(history[99].payload).toBe(104);
  });

  it("multiple subscribers for the same event all receive it", () => {
    const a: unknown[] = [];
    const b: unknown[] = [];
    on("multi", (p) => a.push(p));
    on("multi", (p) => b.push(p));
    emit("multi", { x: 1 });
    expect(a).toEqual([{ x: 1 }]);
    expect(b).toEqual([{ x: 1 }]);
  });
});