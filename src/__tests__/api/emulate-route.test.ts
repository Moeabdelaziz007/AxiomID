/**
 * @jest-environment node
 */

// Mock @emulators/adapter-next before importing the route
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

const mockCreateEmulateHandler = jest.fn(() => ({
  GET: mockGet,
  POST: mockPost,
  PUT: mockPut,
  PATCH: mockPatch,
  DELETE: mockDelete,
}));

jest.mock("@emulators/adapter-next", () => ({
  createEmulateHandler: mockCreateEmulateHandler,
}));

jest.mock("@emulators/github", () => ({
  __emulatorName: "github",
  handleRequest: jest.fn(),
}));

// Common setup shared by all describe blocks: reset modules so each test gets a
// fresh import, clear the handler mock, and opt in to the emulator path.
beforeEach(() => {
  jest.resetModules();
  mockCreateEmulateHandler.mockClear();
  delete process.env.NEXT_PUBLIC_EMULATE_GITHUB;
  // The emulator is off by default; opt in so tests exercise createEmulateHandler.
  process.env.EMULATE_ENABLED = "true";
});

afterEach(() => {
  delete process.env.EMULATE_ENABLED;
  delete process.env.NEXT_PUBLIC_EMULATE_GITHUB;
});

/** Import route and invoke GET to trigger lazy handler build. */
async function importAndTrigger() {
  const route = await import("@/app/api/emulate/[...path]/route");
  const req = new Request("http://localhost/api/emulate/test") as never;
  await route.GET(req, { params: Promise.resolve({ path: ["test"] }) });
  return route;
}

describe("emulate route — handler exports", () => {
  it("exports GET handler", async () => {
    const route = await import("@/app/api/emulate/[...path]/route");
    expect(route.GET).toBeDefined();
  });

  it("exports POST handler", async () => {
    const route = await import("@/app/api/emulate/[...path]/route");
    expect(route.POST).toBeDefined();
  });

  it("exports PUT handler", async () => {
    const route = await import("@/app/api/emulate/[...path]/route");
    expect(route.PUT).toBeDefined();
  });

  it("exports PATCH handler", async () => {
    const route = await import("@/app/api/emulate/[...path]/route");
    expect(route.PATCH).toBeDefined();
  });

  it("exports DELETE handler", async () => {
    const route = await import("@/app/api/emulate/[...path]/route");
    expect(route.DELETE).toBeDefined();
  });

  it("calls createEmulateHandler exactly once on first request", async () => {
    await importAndTrigger();
    expect(mockCreateEmulateHandler).toHaveBeenCalledTimes(1);
  });

  it("calls createEmulateHandler with a services object", async () => {
    await importAndTrigger();
    expect(mockCreateEmulateHandler).toHaveBeenCalledWith(
      expect.objectContaining({ services: expect.any(Object) })
    );
  });
});

describe("emulate route — NEXT_PUBLIC_EMULATE_GITHUB disabled (default)", () => {
  it("does NOT register github service when env var is not set", async () => {
    await importAndTrigger();
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as { services: Record<string, unknown> };
    expect(callArg.services).not.toHaveProperty("github");
  });

  it("registers no services by default", async () => {
    await importAndTrigger();
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as { services: Record<string, unknown> };
    expect(Object.keys(callArg.services)).toHaveLength(0);
  });
});

describe("emulate route — NEXT_PUBLIC_EMULATE_GITHUB enabled", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_EMULATE_GITHUB = "true";
  });

  it("registers github service when NEXT_PUBLIC_EMULATE_GITHUB=true", async () => {
    await importAndTrigger();
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as { services: Record<string, unknown> };
    expect(callArg.services).toHaveProperty("github");
  });

  it("github service has an emulator property", async () => {
    await importAndTrigger();
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as {
      services: Record<string, { emulator: unknown; seed?: Record<string, unknown> }>;
    };
    expect(callArg.services.github.emulator).toBeDefined();
  });

  it("github service seed includes axiomid-dev user", async () => {
    await importAndTrigger();
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as {
      services: Record<string, { emulator: unknown; seed?: Record<string, unknown> }>;
    };
    const seed = callArg.services.github.seed as { users: { login: string }[] };
    expect(seed.users).toEqual(
      expect.arrayContaining([expect.objectContaining({ login: "axiomid-dev" })])
    );
  });

  it("github service seed includes hello-world repo", async () => {
    await importAndTrigger();
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as {
      services: Record<string, { emulator: unknown; seed?: Record<string, unknown> }>;
    };
    const seed = callArg.services.github.seed as { repos: { name: string }[] };
    expect(seed.repos).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "hello-world" })])
    );
  });

  it("does NOT register github service when env var is 'false'", async () => {
    process.env.NEXT_PUBLIC_EMULATE_GITHUB = "false";
    await importAndTrigger();
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as { services: Record<string, unknown> };
    expect(callArg.services).not.toHaveProperty("github");
  });
});
