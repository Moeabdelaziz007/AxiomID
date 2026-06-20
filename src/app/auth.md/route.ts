import { NextRequest } from "next/server";

const AUTH_MD_CONTENT = `# AxiomID Agent Registration

## Agent Verified Flow (Pi Network)

If you have a Pi Network authenticated identity, you can register without human interaction.

### Step 1: Get your Pi ID-JAG

Your Pi SDK provides an ID-JAG JWT after authentication.

### Step 2: Register with AxiomID

\`\`\`bash
curl -X POST https://axiomid.app/api/agent/identity \\
  -H "Content-Type: application/json" \\
  -d '{"type": "identity_assertion", "assertion": "<YOUR_PI_ID_JAG>"}'
\`\`\`

Response:
\`\`\`json
{
  "identity_assertion": "<axiomid-signed-jwt>",
  "scopes": ["api.read", "api.write"]
}
\`\`\`

### Step 3: Exchange for Access Token

\`\`\`bash
curl -X POST https://axiomid.app/api/oauth2/token \\
  -H "Content-Type: application/json" \\
  -d '{"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": "<identity_assertion>"}'
\`\`\`

## User Claimed Flow

For agents without Pi authentication.

### Step 1: Register Anonymously

\`\`\`bash
curl -X POST https://axiomid.app/api/agent/identity \\
  -H "Content-Type: application/json" \\
  -d '{"type": "anonymous"}'
\`\`\`

### Step 2: Show User the Code

The response includes a \`user_code\` and \`verification_uri\`. Show these to the user.

### Step 3: Poll for Token

\`\`\`bash
curl -X POST https://axiomid.app/api/oauth2/token \\
  -H "Content-Type: application/json" \\
  -d '{"grant_type": "claim", "claim_token": "<claim_token>"}'
\`\`\`

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| \`/api/agent/identity\` | POST | Register agent |
| \`/api/agent/identity/claim\` | POST | Start claim ceremony |
| \`/api/oauth2/token\` | POST | Exchange for access token |
| \`/api/oauth2/revoke\` | POST | Revoke access token |
| \`/.well-known/jwks.json\` | GET | Public keys |

## DID Format

\`\`\`
did:axiom:axiomid.app:pi:{uid}
\`\`\`

## Scopes

- \`api.read\` — Read passport, agent status, leaderboard
- \`api.write\` — Update agent, publish skills, claim stamps
- \`agent.sign\` — Sign payloads with DID key
`;

/**
 * Serves Markdown documentation for the AxiomID agent registration and authentication flow.
 *
 * @returns A Response containing the Markdown documentation.
 */
export async function GET(_request: NextRequest) {
  return new Response(AUTH_MD_CONTENT, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
