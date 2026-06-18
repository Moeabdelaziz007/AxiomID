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

describe("emulate route — handler exports", () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreateEmulateHandler.mockClear();
    delete process.env.NEXT_PUBLIC_EMULATE_GITHUB;
  });

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

  it("calls createEmulateHandler exactly once on module load", async () => {
    await import("@/app/api/emulate/[...path]/route");
    expect(mockCreateEmulateHandler).toHaveBeenCalledTimes(1);
  });

  it("calls createEmulateHandler with a services object", async () => {
    await import("@/app/api/emulate/[...path]/route");
    expect(mockCreateEmulateHandler).toHaveBeenCalledWith(
      expect.objectContaining({ services: expect.any(Object) })
    );
  });
});

describe("emulate route — NEXT_PUBLIC_EMULATE_GITHUB disabled (default)", () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreateEmulateHandler.mockClear();
    delete process.env.NEXT_PUBLIC_EMULATE_GITHUB;
  });

  it("does NOT register github service when env var is not set", async () => {
    await import("@/app/api/emulate/[...path]/route");
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as { services: Record<string, unknown> };
    expect(callArg.services).not.toHaveProperty("github");
  });

  it("registers no services by default", async () => {
    await import("@/app/api/emulate/[...path]/route");
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as { services: Record<string, unknown> };
    expect(Object.keys(callArg.services)).toHaveLength(0);
  });
});

describe("emulate route — NEXT_PUBLIC_EMULATE_GITHUB enabled", () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreateEmulateHandler.mockClear();
    process.env.NEXT_PUBLIC_EMULATE_GITHUB = "true";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EMULATE_GITHUB;
  });

  it("registers github service when NEXT_PUBLIC_EMULATE_GITHUB=true", async () => {
    await import("@/app/api/emulate/[...path]/route");
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as { services: Record<string, unknown> };
    expect(callArg.services).toHaveProperty("github");
  });

  it("github service has an emulator property", async () => {
    await import("@/app/api/emulate/[...path]/route");
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as {
      services: Record<string, { emulator: unknown; seed?: Record<string, unknown> }>;
    };
    expect(callArg.services.github.emulator).toBeDefined();
  });

  it("github service seed includes axiomid-dev user", async () => {
    await import("@/app/api/emulate/[...path]/route");
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as {
      services: Record<string, { emulator: unknown; seed?: Record<string, unknown> }>;
    };
    const seed = callArg.services.github.seed as { users: { login: string }[] };
    expect(seed.users).toEqual(
      expect.arrayContaining([expect.objectContaining({ login: "axiomid-dev" })])
    );
  });

  it("github service seed includes hello-world repo", async () => {
    await import("@/app/api/emulate/[...path]/route");
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
    await import("@/app/api/emulate/[...path]/route");
    const callArg = mockCreateEmulateHandler.mock.calls[0][0] as { services: Record<string, unknown> };
    expect(callArg.services).not.toHaveProperty("github");
  });
});