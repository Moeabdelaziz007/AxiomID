/**
 * @jest-environment node
 */

import { GET } from "@/app/auth.md/route";

describe("GET /auth.md", () => {
  it("returns auth.md as text/markdown", async () => {
    const req = new Request("http://localhost/auth.md") as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    const body = await res.text();
    expect(body).toContain("AxiomID");
    expect(body).toContain("Agent Verified");
    expect(body).toContain("User Claimed");
  });
});
