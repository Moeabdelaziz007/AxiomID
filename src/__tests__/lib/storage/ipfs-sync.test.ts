import { generateCIDv0, publishToMockGateway, publishToIPFS } from "@/lib/storage/ipfs-sync";

describe("IPFS Sync & CID Generation", () => {
  it("generates correct base58 CIDv0 multihash", () => {
    const data = JSON.stringify({ identity: "test" });
    const cid = generateCIDv0(data);
    expect(cid).toMatch(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/);
  });

  it("publishes to mock IPFS gateway and resolves CID", async () => {
    const payload = { did: "did:axiom:test", claims: [] };
    const res = await publishToMockGateway(payload);
    expect(res.cid).toMatch(/^Qm/);
    expect(res.url).toContain(res.cid);
    expect(res.mock).toBe(true);
  });

  it("publishes to IPFS (falls back to mock when no credentials)", async () => {
    const payload = { did: "did:axiom:test", claims: [] };
    const res = await publishToIPFS(payload);
    expect(res.cid).toMatch(/^Qm/);
    expect(res.url).toContain(res.cid);
  });
});

describe("publishToIPFS — Pinata JWT path (PR change)", () => {
  let savedPinataJwt: string | undefined;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    savedPinataJwt = process.env.PINATA_JWT;
    process.env.PINATA_JWT = "test-pinata-jwt";
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    if (savedPinataJwt === undefined) {
      delete process.env.PINATA_JWT;
    } else {
      process.env.PINATA_JWT = savedPinataJwt;
    }
  });

  it("calls Pinata API with correct headers and body when PINATA_JWT is set", async () => {
    const fakeIpfsHash = "QmPinataSuccessHash1234567890abcdefghij";
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: fakeIpfsHash }),
    });

    const payload = { did: "did:axiom:test", claims: ["claim1"] };
    await publishToIPFS(payload);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Authorization": "Bearer test-pinata-jwt",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("returns cid and url from Pinata when API call succeeds", async () => {
    const fakeIpfsHash = "QmPinataSuccessHash1234567890abcdefghij";
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: fakeIpfsHash }),
    });

    const payload = { did: "did:axiom:test", claims: [] };
    const res = await publishToIPFS(payload);

    expect(res.cid).toBe(fakeIpfsHash);
    expect(res.url).toBe(`https://ipfs.io/ipfs/${fakeIpfsHash}`);
  });

  it("does not set mock:true when Pinata call succeeds", async () => {
    const fakeIpfsHash = "QmPinataSuccessHash1234567890abcdefghij";
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: fakeIpfsHash }),
    });

    const payload = { did: "did:axiom:test" };
    const res = await publishToIPFS(payload);

    expect(res.mock).toBeUndefined();
  });

  it("falls back to mock gateway when Pinata returns non-ok HTTP status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });

    const payload = { did: "did:axiom:test", claims: [] };
    const res = await publishToIPFS(payload);

    expect(res.cid).toMatch(/^Qm/);
    expect(res.url).toContain(res.cid);
    expect(res.mock).toBe(true);
  });

  it("falls back to mock gateway when fetch throws a network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const payload = { did: "did:axiom:test", claims: [] };
    const res = await publishToIPFS(payload);

    expect(res.cid).toMatch(/^Qm/);
    expect(res.url).toContain(res.cid);
    expect(res.mock).toBe(true);
  });

  it("mock fallback CID is deterministic for the same payload", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const payload = { did: "did:axiom:deterministic-test" };
    const res1 = await publishToIPFS(payload);
    const res2 = await publishToIPFS(payload);

    expect(res1.cid).toBe(res2.cid);
  });

  it("includes pinataContent in request body", async () => {
    const fakeIpfsHash = "QmContentBodyCheck1234567890abcdefghij";
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: fakeIpfsHash }),
    });

    const payload = { did: "did:axiom:test", custom: "data" };
    await publishToIPFS(payload);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.pinataContent).toEqual(payload);
    expect(body.pinataOptions.cidVersion).toBe(0);
  });
});

