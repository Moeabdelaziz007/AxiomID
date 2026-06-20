import { generateCIDv0, publishToMockGateway } from "@/lib/storage/ipfs-sync";

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
  });
});
