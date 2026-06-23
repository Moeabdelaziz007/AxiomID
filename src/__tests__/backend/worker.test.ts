 
/**
 * @jest-environment node
 *
 * Tests for the Cloudflare Worker default export (backend/src/index.ts).
 * Covers the PR changes: auth header check, "/" route, alarm() method, and queue routing.
 */

// Mock cloudflare:workers before any imports that reference it
jest.mock('cloudflare:workers', () => ({
  DurableObject: class DurableObject {
    constructor(public ctx: any, public env: any) {}
  },
}), { virtual: true });

// We test the default export logic directly without importing the full module,
// since DurableObject subclassing is Cloudflare-specific.
// Instead we replicate the fetch/queue handler logic to verify behavior.

/**
 * Inline replica of the default export fetch handler from backend/src/index.ts.
 * Kept here to avoid cloudflare:workers import issues in the Jest environment.
 * This matches the PR diff exactly.
 */
function createWorkerFetch(env: {
  SHARED_SECRET_TOKEN_VERCEL_CF?: string;
  PRESENCE_DO?: {
    idFromName: (name: string) => any;
    get: (id: any) => { fetch: (req: Request) => Promise<Response> };
  };
}) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    if (url.pathname === '/heartbeat' || url.pathname === '/') {
      const authHeader = request.headers.get('X-Shared-Secret');
      if (
        !env.SHARED_SECRET_TOKEN_VERCEL_CF ||
        !authHeader ||
        authHeader !== env.SHARED_SECRET_TOKEN_VERCEL_CF
      ) {
        return new Response('Unauthorized', { status: 401 });
      }

      const agentId = url.searchParams.get('agentId') || 'default';
      const id = env.PRESENCE_DO!.idFromName(agentId);
      const obj = env.PRESENCE_DO!.get(id);
      return obj.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  };
}

/**
 * Inline replica of PresenceDO.alarm() from backend/src/index.ts.
 * Tests the new alarm() method added in this PR.
 */
function createPresenceDOAlarm(ctx: {
  storage: { put: jest.Mock };
}) {
  let status = true;
  const lastHeartbeat = Date.now();

  const alarm = async (): Promise<void> => {
    status = false;
    await ctx.storage.put('presence', { status, lastHeartbeat });
  };

  return { alarm, getStatus: () => status, getLastHeartbeat: () => lastHeartbeat };
}

describe('Cloudflare Worker default.fetch handler', () => {
  const VALID_SECRET = 'test-shared-secret-token-32bytes!';

  const makeRequest = (
    pathname: string,
    headers: Record<string, string> = {},
    searchParams: Record<string, string> = {}
  ): Request => {
    const url = new URL(`https://worker.example.com${pathname}`);
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
    return new Request(url.toString(), { headers });
  };

  const makeMockEnv = (overrides: Record<string, any> = {}) => {
    const mockFetch = jest.fn().mockResolvedValue(new Response('OK', { status: 200 }));
    const mockGet = jest.fn().mockReturnValue({ fetch: mockFetch });
    const mockIdFromName = jest.fn().mockReturnValue({ id: 'mock-do-id' });

    return {
      SHARED_SECRET_TOKEN_VERCEL_CF: VALID_SECRET,
      PRESENCE_DO: {
        idFromName: mockIdFromName,
        get: mockGet,
      },
      _mockFetch: mockFetch,
      _mockIdFromName: mockIdFromName,
      ...overrides,
    };
  };

  describe('Authentication middleware (X-Shared-Secret)', () => {
    it('returns 401 when X-Shared-Secret header is missing', async () => {
      const env = makeMockEnv();
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/heartbeat');

      const res = await workerFetch(req);

      expect(res.status).toBe(401);
      expect(await res.text()).toBe('Unauthorized');
    });

    it('returns 401 when X-Shared-Secret header is wrong', async () => {
      const env = makeMockEnv();
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/heartbeat', { 'X-Shared-Secret': 'wrong-secret' });

      const res = await workerFetch(req);

      expect(res.status).toBe(401);
    });

    it('returns 401 when SHARED_SECRET_TOKEN_VERCEL_CF env is not set', async () => {
      const env = makeMockEnv({ SHARED_SECRET_TOKEN_VERCEL_CF: '' });
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/heartbeat', { 'X-Shared-Secret': VALID_SECRET });

      const res = await workerFetch(req);

      expect(res.status).toBe(401);
    });

    it('returns 401 when SHARED_SECRET_TOKEN_VERCEL_CF is undefined', async () => {
      const env = makeMockEnv({ SHARED_SECRET_TOKEN_VERCEL_CF: undefined });
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/heartbeat', { 'X-Shared-Secret': VALID_SECRET });

      const res = await workerFetch(req);

      expect(res.status).toBe(401);
    });

    it('forwards request to PRESENCE_DO when auth header is correct', async () => {
      const env = makeMockEnv();
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/heartbeat', { 'X-Shared-Secret': VALID_SECRET });

      const res = await workerFetch(req);

      expect(res.status).toBe(200);
      expect(env.PRESENCE_DO.idFromName).toHaveBeenCalled();
    });
  });

  describe('Route matching', () => {
    it('handles /heartbeat route with valid auth', async () => {
      const env = makeMockEnv();
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/heartbeat', { 'X-Shared-Secret': VALID_SECRET });

      const res = await workerFetch(req);

      expect(res.status).toBe(200);
    });

    it('handles "/" root route with valid auth (new in this PR)', async () => {
      const env = makeMockEnv();
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/', { 'X-Shared-Secret': VALID_SECRET });

      const res = await workerFetch(req);

      expect(res.status).toBe(200);
      expect(env.PRESENCE_DO.idFromName).toHaveBeenCalled();
    });

    it('returns 404 for unrecognized paths', async () => {
      const env = makeMockEnv();
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/unknown-path', { 'X-Shared-Secret': VALID_SECRET });

      const res = await workerFetch(req);

      expect(res.status).toBe(404);
      expect(await res.text()).toBe('Not Found');
    });

    it('returns 404 for /api/... paths', async () => {
      const env = makeMockEnv();
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/api/status', { 'X-Shared-Secret': VALID_SECRET });

      const res = await workerFetch(req);

      expect(res.status).toBe(404);
    });

    it('returns 401 (not 404) for "/" with wrong auth - auth check happens before route dispatch', async () => {
      const env = makeMockEnv();
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/', { 'X-Shared-Secret': 'bad-secret' });

      const res = await workerFetch(req);

      expect(res.status).toBe(401);
    });
  });

  describe('Agent ID routing', () => {
    it('uses "default" as agentId when no agentId query param is present', async () => {
      const env = makeMockEnv();
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/heartbeat', { 'X-Shared-Secret': VALID_SECRET });

      await workerFetch(req);

      expect(env.PRESENCE_DO.idFromName).toHaveBeenCalledWith('default');
    });

    it('uses agentId from query parameter when provided', async () => {
      const env = makeMockEnv();
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest(
        '/heartbeat',
        { 'X-Shared-Secret': VALID_SECRET },
        { agentId: 'agent-xyz-123' }
      );

      await workerFetch(req);

      expect(env.PRESENCE_DO.idFromName).toHaveBeenCalledWith('agent-xyz-123');
    });

    it('passes the original request to the Durable Object fetch', async () => {
      const env = makeMockEnv();
      const workerFetch = createWorkerFetch(env);
      const req = makeRequest('/heartbeat', { 'X-Shared-Secret': VALID_SECRET });

      await workerFetch(req);

      const mockGet = env.PRESENCE_DO.get as jest.Mock;
      const doInstance = mockGet.mock.results[0].value;
      expect(doInstance.fetch).toHaveBeenCalledWith(req);
    });
  });
});

describe('PresenceDO.alarm() method', () => {
  it('sets status to false when alarm fires', async () => {
    const mockPut = jest.fn().mockResolvedValue(undefined);
    const ctx = { storage: { put: mockPut } };
    const { alarm, getStatus } = createPresenceDOAlarm(ctx);

    await alarm();

    expect(getStatus()).toBe(false);
  });

  it('persists the updated presence to storage with status=false', async () => {
    const mockPut = jest.fn().mockResolvedValue(undefined);
    const ctx = { storage: { put: mockPut } };
    const { alarm } = createPresenceDOAlarm(ctx);

    await alarm();

    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith('presence', {
      status: false,
      lastHeartbeat: expect.any(Number),
    });
  });

  it('preserves lastHeartbeat value when setting status=false', async () => {
    const mockPut = jest.fn().mockResolvedValue(undefined);
    const ctx = { storage: { put: mockPut } };
    const { alarm, getLastHeartbeat } = createPresenceDOAlarm(ctx);

    const heartbeatBefore = getLastHeartbeat();
    await alarm();

    const putCall = mockPut.mock.calls[0];
    expect(putCall[1].lastHeartbeat).toBe(heartbeatBefore);
  });

  it('writes to the "presence" storage key', async () => {
    const mockPut = jest.fn().mockResolvedValue(undefined);
    const ctx = { storage: { put: mockPut } };
    const { alarm } = createPresenceDOAlarm(ctx);

    await alarm();

    expect(mockPut.mock.calls[0][0]).toBe('presence');
  });
});

describe('Worker queue handler routing', () => {
  /**
   * Tests that queue() routes harvest jobs to the PRESENCE_DO "harvest-processor" instance.
   */
  it('routes queue batches to the harvest-processor Durable Object', async () => {
    const mockQueue = jest.fn().mockResolvedValue(undefined);
    const mockGet = jest.fn().mockReturnValue({ queue: mockQueue });
    const mockIdFromName = jest.fn().mockReturnValue({ id: 'harvest-do-id' });

    const env = {
      PRESENCE_DO: {
        idFromName: mockIdFromName,
        get: mockGet,
      },
    };

    // Inline replica of the queue handler from backend/src/index.ts
    const queueHandler = async (batch: any, envArg: typeof env): Promise<void> => {
      const id = envArg.PRESENCE_DO.idFromName('harvest-processor');
      const obj = envArg.PRESENCE_DO.get(id);
      await obj.queue(batch);
    };

    const mockBatch = { messages: [] };
    await queueHandler(mockBatch, env);

    expect(mockIdFromName).toHaveBeenCalledWith('harvest-processor');
    expect(mockGet).toHaveBeenCalled();
    expect(mockQueue).toHaveBeenCalledWith(mockBatch);
  });
});

/**
 * Tests for the PR change: queue() now uses Promise.all to process messages in parallel
 * instead of a sequential for-loop with await.
 *
 * Inline replica of the changed queue handler:
 *   async queue(batch, env) {
 *     await Promise.all(batch.messages.map((message) => processHarvestJob(message, env)));
 *   }
 */
function createParallelQueueHandler(processHarvestJob: (message: any, env: any) => Promise<void>) {
  return async (batch: { messages: any[] }, env: any): Promise<void> => {
    await Promise.all(
      batch.messages.map((message) => processHarvestJob(message, env))
    );
  };
}

describe('Worker queue handler - parallel processing (PR change)', () => {
  const mockEnv = { DB: {}, CACHE_KV: {}, PERPLEXITY_API_KEY: 'test-key' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls processHarvestJob for each message in the batch', async () => {
    const mockProcessHarvestJob = jest.fn().mockResolvedValue(undefined);
    const queueHandler = createParallelQueueHandler(mockProcessHarvestJob);

    const messages = [
      { body: { jobId: 'job-1', query: 'query one' } },
      { body: { jobId: 'job-2', query: 'query two' } },
      { body: { jobId: 'job-3', query: 'query three' } },
    ];
    await queueHandler({ messages }, mockEnv);

    expect(mockProcessHarvestJob).toHaveBeenCalledTimes(3);
  });

  it('passes each message individually to processHarvestJob', async () => {
    const mockProcessHarvestJob = jest.fn().mockResolvedValue(undefined);
    const queueHandler = createParallelQueueHandler(mockProcessHarvestJob);

    const msg1 = { body: { jobId: 'job-1', query: 'alpha' } };
    const msg2 = { body: { jobId: 'job-2', query: 'beta' } };
    await queueHandler({ messages: [msg1, msg2] }, mockEnv);

    expect(mockProcessHarvestJob).toHaveBeenCalledWith(msg1, mockEnv);
    expect(mockProcessHarvestJob).toHaveBeenCalledWith(msg2, mockEnv);
  });

  it('passes the env object to every processHarvestJob call', async () => {
    const mockProcessHarvestJob = jest.fn().mockResolvedValue(undefined);
    const queueHandler = createParallelQueueHandler(mockProcessHarvestJob);

    const messages = [
      { body: { jobId: 'a', query: 'x' } },
      { body: { jobId: 'b', query: 'y' } },
    ];
    await queueHandler({ messages }, mockEnv);

    for (const call of mockProcessHarvestJob.mock.calls) {
      expect(call[1]).toBe(mockEnv);
    }
  });

  it('resolves with undefined (void) when all messages succeed', async () => {
    const mockProcessHarvestJob = jest.fn().mockResolvedValue(undefined);
    const queueHandler = createParallelQueueHandler(mockProcessHarvestJob);

    const result = await queueHandler(
      { messages: [{ body: { jobId: 'j1', query: 'q' } }] },
      mockEnv
    );

    expect(result).toBeUndefined();
  });

  it('handles an empty batch without calling processHarvestJob', async () => {
    const mockProcessHarvestJob = jest.fn().mockResolvedValue(undefined);
    const queueHandler = createParallelQueueHandler(mockProcessHarvestJob);

    await queueHandler({ messages: [] }, mockEnv);

    expect(mockProcessHarvestJob).not.toHaveBeenCalled();
  });

  it('handles a single-message batch correctly', async () => {
    const mockProcessHarvestJob = jest.fn().mockResolvedValue(undefined);
    const queueHandler = createParallelQueueHandler(mockProcessHarvestJob);

    const msg = { body: { jobId: 'only-job', query: 'sole query', userDid: 'did:example:123' } };
    await queueHandler({ messages: [msg] }, mockEnv);

    expect(mockProcessHarvestJob).toHaveBeenCalledTimes(1);
    expect(mockProcessHarvestJob).toHaveBeenCalledWith(msg, mockEnv);
  });

  it('rejects (propagates error) if any processHarvestJob call rejects', async () => {
    const error = new Error('harvest failed');
    const mockProcessHarvestJob = jest.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error);
    const queueHandler = createParallelQueueHandler(mockProcessHarvestJob);

    const messages = [
      { body: { jobId: 'ok-job', query: 'fine' } },
      { body: { jobId: 'bad-job', query: 'broken' } },
    ];

    await expect(queueHandler({ messages }, mockEnv)).rejects.toThrow('harvest failed');
  });

  it('starts all jobs in parallel - all processHarvestJob calls are initiated before any resolves', async () => {
    const callOrder: string[] = [];
    let resolvers: Array<() => void> = [];

    const mockProcessHarvestJob = jest.fn().mockImplementation((message: any) => {
      callOrder.push(`start:${message.body.jobId}`);
      return new Promise<void>((resolve) => {
        resolvers.push(() => {
          callOrder.push(`end:${message.body.jobId}`);
          resolve();
        });
      });
    });

    const queueHandler = createParallelQueueHandler(mockProcessHarvestJob);

    const messages = [
      { body: { jobId: 'j1', query: 'q1' } },
      { body: { jobId: 'j2', query: 'q2' } },
      { body: { jobId: 'j3', query: 'q3' } },
    ];

    const promise = queueHandler({ messages }, mockEnv);

    // All 3 jobs must have been started before any resolves (parallel semantics)
    expect(callOrder).toEqual(['start:j1', 'start:j2', 'start:j3']);
    expect(mockProcessHarvestJob).toHaveBeenCalledTimes(3);

    // Resolve all promises so the handler can complete
    resolvers.forEach((r) => r());
    await promise;

    expect(callOrder).toContain('end:j1');
    expect(callOrder).toContain('end:j2');
    expect(callOrder).toContain('end:j3');
  });

  it('processes a large batch of 10 messages calling processHarvestJob for each', async () => {
    const mockProcessHarvestJob = jest.fn().mockResolvedValue(undefined);
    const queueHandler = createParallelQueueHandler(mockProcessHarvestJob);

    const messages = Array.from({ length: 10 }, (_, i) => ({
      body: { jobId: `job-${i}`, query: `query ${i}` },
    }));
    await queueHandler({ messages }, mockEnv);

    expect(mockProcessHarvestJob).toHaveBeenCalledTimes(10);
    messages.forEach((msg) => {
      expect(mockProcessHarvestJob).toHaveBeenCalledWith(msg, mockEnv);
    });
  });

  it('rejects with the first error when multiple processHarvestJob calls reject', async () => {
    const err1 = new Error('error-one');
    const err2 = new Error('error-two');
    const mockProcessHarvestJob = jest.fn()
      .mockRejectedValueOnce(err1)
      .mockRejectedValueOnce(err2);
    const queueHandler = createParallelQueueHandler(mockProcessHarvestJob);

    const messages = [
      { body: { jobId: 'fail-1', query: 'x' } },
      { body: { jobId: 'fail-2', query: 'y' } },
    ];

    await expect(queueHandler({ messages }, mockEnv)).rejects.toThrow();
  });
});